/**
* This script handles visualization of relationships between ontological 
* terms as they are stored in a Neo4j database.
*/

// Location of our CGI script returning the metadata we need to draw nodes on our graph
var NEO4J_QUERY_URL = "/neo4j_arbor";

// A boolean variable to keep track of whether or not we are in a drag state.
var isDragged = false;

Array.prototype.remove = function(from, to){ this.splice(from, (to=[0,from||1,++to-from][arguments.length])<0?this.length+to:to); return this.length; };

/**
* Add nodes to arbor graph anchored to a specific root node. This function should really 
* only be called once at page load.
*/
function addNodesFromDBWithRoot(data, ps, id, name) {
    root = ps.addNode(id, {label: name, nodeType: "root", color: "red", fixed: true, expanded: true});
    addNodesFromDB(data.children, ps, root, true, "out");
    addNodesFromDB(data.parents, ps, root, true, "in");
}

/**
* Add nodes to our arbor graph. This function should be called each time that children/parents of a target
* node need to be added to the graph.
*/
function addNodesFromDB(data, ps, root, collapse, direction) {
    // If our root node has more than 5 children we want to collapse these all into one 'compact' node
    if (data.length > 5 && collapse) {
        child = ps.addNode(root.name + '_compact_children', {color: "orange", label: getCompactLabel(ps, data), json: data, shape: "dot", expanded: false});

        if (direction == "in") {
            // CHILD --> PARENT
            ps.addEdge(root, child, {weight: 1, color: 'black', length: .4, rel_type: 'is_a', direction: direction});
        } else {
            // PARENT --> CHILD
            ps.addEdge(child, root, {weight: 1, color: 'black', length: .4, rel_type: 'is_a', direction: direction});
        }
    } else {
        $.each(data, function(i, item) {
            // We don't want to add the same node twice to the graph
            if ( !(ps.getNode(item.id)) ) {
                child = ps.addNode(item.id, {color: item.color, nodeType: "child", label: item.name, expanded: false});

                if (direction == "in") {
                    ps.addEdge(root, child, {weight: 1, color: 'black', length: .4, rel_type: 'is_a', direction: direction});
                } else {
                    ps.addEdge(child, root, {weight: 1, color: 'black', length: .4, rel_type: 'is_a', direction: direction});
                }
            }
        });
    }
}

/**
* Generate the label for our compact nodes. We need to be careful to not count any
* nodes that currently are drawn on our canvas.
*/
function getCompactLabel(ps, json) {
    var label = 0;

    $.each(json, function(i, item) {
        if ( !(ps.getNode(item.id)) ) {
            label++;
        }
    });

    return label;
}

/**
* Add nodes to the arbor graph from our compact node select list. 
*/
function addNodesFromSelectList(rootIdCompact, ps, selectAll) {
    var rootId = rootIdCompact.replace("_compact_children", "");
    var idsToRemove = [];
    var vals = [];

    // If the selectAll bool is passed in as true the 'Select All'
    // button was clicked in our popup indicating all children should 
    // be displayed.
    if (selectAll) {
        $(".checklist").children("li:visible").children("input").each(function() {
            vals.push($(this).val());
        })
    } else {
        $("#popupChildren :input:checked").each(function() {
            vals.push($(this).val());
        });
    }

    rootNodeCompact = ps.getNode(rootIdCompact);
    rootNode = ps.getNode(rootId);
    allChildren = rootNodeCompact.data.json;

    selectedChildren = jQuery.grep(allChildren, function(n, i) {
        var keep = false;
        var inVals = jQuery.inArray(n.id.toString(), vals)
        
        if (inVals != -1) { 
            
            idsToRemove.push(n.id);
            keep = true;
        }

        return keep;
    });

    currChildrenCount = parseInt(rootNodeCompact.data.label);
    updatedLabel = (currChildrenCount - selectedChildren.length)
    if (updatedLabel == 0) {
        ps.pruneNode(rootNodeCompact);
    } else {
        rootNodeCompact.data.label = updatedLabel
    }

    // Close the overlay right before we add the nodes to the graph...
    $("#button-none").click();
    addNodesFromDB(selectedChildren, ps, rootNode, false, selectedChildren[0].direction);

    rootNodeCompact.data.json = $.grep(allChildren, function(n, i) {
        return !(n.id in idsToRemove);
    });
}   

/**
* Generate the HTML for the select list that pops-up when clicking 
* on a compact node.
*/
function loadPopup(ps, childrenJson) {
    childToInsert = [];
    var i = 0;

    // Clear out the contents of our current div if our popup window
    // has already been made once.
    if ($("#childrenList")) {
        $("#childrenList").remove();
        $("#nodeFilter").empty();
    }
    
    childToInsert[i++] = "<select id=\"childrenList\" multiple=\"multiple\">"
    $.each(childrenJson, function(count, item) {
        if ( !(ps.getNode(item.id)) ) {
            childToInsert[i++] = "<option value=\"";
            childToInsert[i++] = item.id;
            childToInsert[i++] = "\" id=\"";
            childToInsert[i++] = item.name;
            childToInsert[i++] = "\">";
            childToInsert[i++] = item.name;
            childToInsert[i++] = "</option>";
        }
    });
    childToInsert[i++] = "</select>";

    $("#nodeFilter").after(childToInsert.join(''));

    $("#childrenList").toChecklist();
    $(".list_filter").liveFilter();

    x = $("#hiddenLink").click();
}

// TODO: Add a direction field and hasChildren field to the JSON returned
(function($) {
  Renderer = function(canvas){
    var canvas = $(canvas).get(0);
    var ctx = canvas.getContext("2d");
    var gfx = arbor.Graphics(canvas);
    var particleSystem = null;

    var that = {
      init:function(system){
        particleSystem = system
        particleSystem.screenSize(canvas.width, canvas.height) 
        particleSystem.screenPadding(80)

        that.initMouseHandling()
      },

      redraw:function(){
        if (!particleSystem) return

        gfx.clear() // convenience ƒ: clears the whole canvas rect

        // draw the nodes & save their bounds for edge drawing
        var nodeBoxes = {};

        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords

          // determine the box size and round off the coords if we'll be 
          // drawing a text label (awful alignment jitter otherwise...)
          var label = node.data.label||""
          var w = ctx.measureText(""+label).width + 11
          if (!(""+label).match(/^[ \t]*$/)){
            pt.x = Math.floor(pt.x)
            pt.y = Math.floor(pt.y)
          }else{
            label = null
          }

          // draw a rectangle centered at pt
          if (node.data.color) ctx.fillStyle = node.data.color
          else ctx.fillStyle = "rgba(0,0,0,.2)"
          if (node.data.color=='none') ctx.fillStyle = "white"

          if (node.data.shape=='dot'){
            gfx.oval(pt.x-w/2, (pt.y-w/2), w,w, {fill:ctx.fillStyle})
            nodeBoxes[node.name] = [pt.x-w/2, pt.y-w/2, w,w]
          }else{
            gfx.rect(pt.x-w/2, pt.y-10, w,20, 4, {fill:ctx.fillStyle})
            nodeBoxes[node.name] = [pt.x-w/2, pt.y-11, w, 22]
          }

          // draw the text
          if (label){

            if (node.data.shape == 'dot') {              
                ctx.font = "10px Helvetica"
            } else {
                ctx.font = "11px Helvetica"
            }
            ctx.textAlign = "center"
            ctx.fillStyle = "white"
            ctx.fillText(label||"", pt.x, pt.y+4)
          }
        })    			


        // draw the edges
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords

          var weight = edge.data.weight
          var color = edge.data.color

          if (!color || (""+color).match(/^[ \t]*$/)) color = null

          // Find the start point
          // Depending on whether or not this edge is going from child -> parent
          // or parent -> child will influence the values of tail and head
          var tail = intersect_line_box(pt1, pt2, nodeBoxes[edge.source.name])
          var head = intersect_line_box(tail, pt2, nodeBoxes[edge.target.name])

          ctx.save() 
            ctx.beginPath()
            ctx.lineWidth = (!isNaN(weight)) ? parseFloat(weight) : 1
            ctx.strokeStyle = (color) ? color : "#cccccc"

            ctx.moveTo(tail.x, tail.y)
            ctx.lineTo(head.x, head.y)
            ctx.stroke()
          ctx.restore()

          // draw an arrowhead 
          ctx.save()
              // move to the head position of the edge we just drew
              var wt = !isNaN(weight) ? parseFloat(weight) : 1
              var arrowLength = 6 + wt
              var arrowWidth = 2 + wt
              ctx.fillStyle = (color) ? color : "#cccccc"
              ctx.translate(head.x, head.y);
              ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));

              // delete some of the edge that's already there (so the point isn't hidden)
              ctx.clearRect(-arrowLength/2,-wt/2, arrowLength/2,wt)

              // draw the chevron
              ctx.beginPath();
              ctx.moveTo(-arrowLength, arrowWidth);
              ctx.lineTo(0, 0);
              ctx.lineTo(-arrowLength, -arrowWidth);
              ctx.lineTo(-arrowLength * 0.8, -0);
              ctx.closePath();
              ctx.fill();
          ctx.restore()


          // Now draw our text (Thanks Neo4j guys!)
          if (edge.data.rel_type) {
              // Really hacky stuff going on here...
              ctx.save()
                  ctx.font = "10px Helvetica",

                  ctx.translate(head.x, head.y)

                  dx = head.x - tail.x
                  if (dx < 0) {
                    ctx.textAlign = "left"
                    ctx.rotate(Math.atan2(head.y - tail.y, dx) - Math.PI)
                    ctx.translate(20, -4)
                  } else {
                    ctx.textAlign = "right"
                    ctx.rotate(Math.atan2(head.y - tail.y, dx))
                    ctx.translate(-20, -4)
                  }

                  ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
                  ctx.fillText(edge.data.rel_type||"", 0, 0)
              ctx.restore()
          }
       })
      },

      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        selected = null;
        nearest = null;
        var dragged = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e){
            $("#viewport").removeClass('linkable')

            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            selected = nearest = dragged = particleSystem.nearest(_mouseP);

            if (dragged.node !== null) dragged.node.fixed = true
                        
            $(canvas).bind('mousemove', handler.dragged);
            $(window).bind('mouseup', handler.dropped);
            
            return false
          },

          dragged:function(e){
            /**
            * Function that handles when node is being dragged. 
            * 
            * Checks to make sure we are over a node when dragging and if so
            * executes the necessary calculations that redraw the canvas with the
            * moved node.
            **/ 
            var old_nearest = nearest && nearest.node._id
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            
            // The isDragged boolean keeps track of when we are in a drag state
            // and is needed to differentiate between the click + drag event and the
            // click event
            if (isDragged == false) { isDragged = true; }

            if (!nearest) return    
            if (dragged !== null && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            /**
            * Handles the dropped/mouseup state 
            *
            * On mouseup this function checks whether or not we are in a drag state
            * and if so will take the necessary steps to allow the system to run through
            * its simulations with the new position of the node.
            *
            * If the mouseup event is encountered in a non-drag state an AJAX call is fired
            * to retrieve the children of the node clicked (if the node has children) and the
            * cnavas is redrawn.
            **/
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
             
            // modularize this check to see if we are over a clickable node
            if (isDragged) {
                if (dragged.node.data.color == "green" ||           
                    dragged.node.data.color == "orange") {
                    $("#viewport").addClass("linkable");
                }

                dragged.node.tempMass = 1000
                dragged = null
                selected = null
                isDragged = false;
            } else {
                if (dragged.node.data.shape == "dot") {
                    // We want to store some sort of reference to the ID of the parent
                    // node whose children will populate our select list
                    $(".select-button").val(dragged.node.name);

                    loadPopup(particleSystem, dragged.node.data.json)
                } else if (dragged.node.data.expanded == false && 
                           dragged.node.data.color != "gray") {
                    $.ajax({
                        type: "GET",
                        url: NEO4J_QUERY_URL,
                        data: "id=" + dragged.node.name,
                        dataType: "json",
                        success: function(data) { 
                            addNodesFromDB(data.children, particleSystem, dragged.node, true, "out");
                            addNodesFromDB(data.parents, particleSystem, dragged.node, true, "in");
                        }
                    });

                    dragged.node.data.expanded = true;
                }
            }
            

            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            _mouseP = null

            return false
          },

          moved: function(e) {
              /**
              * Handles the mousemove event.
              * 
              * If the mouse point is moved over a node with children this 
              * function adds a class to the canvas that transforms our 
              * mouse cursor to indicate the node is clickable
              */ 
              var pos = $(canvas).offset();
              _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
              nearest = particleSystem.nearest(_mouseP);

              if (!nearest.node) return false

              if ((nearest.node.data.color == "green" ||
                  nearest.node.data.color == "orange") &&
                  isDragged == false) {
                  if (nearest.distance < 50) {
                      $("#viewport").addClass('linkable')
                  } else {
                      $("#viewport").removeClass('linkable')
                  }
              } else {
                  $("#viewport").removeClass('linkable')
              }

              return false
          }
        }

        $(canvas).mousemove(handler.moved);
        $(canvas).mousedown(handler.clicked);

        // When we leave the boundaries of our canvas we should drop our 
        // dragging event and allow the particle system to return to its 
        // original state.
        $(canvas).mouseout(function(e) {
            if (isDragged) {
                $(canvas).unbind('mousemove', handler.dragged);
            }
        });
      }
    }

    // helpers for figuring out where to draw arrows (thanks springy.js)
    var intersect_line_line = function(p1, p2, p3, p4)
    {
      var denom = ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y));
      if (denom === 0) return false // lines are parallel
      var ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) / denom;
      var ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) / denom;

      if (ua < 0 || ua > 1 || ub < 0 || ub > 1)  return false
      return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    }

    var intersect_line_box = function(p1, p2, boxTuple)
    {
      var p3 = {x:boxTuple[0], y:boxTuple[1]},
          w = boxTuple[2],
          h = boxTuple[3]

      var tl = {x: p3.x, y: p3.y};
      var tr = {x: p3.x + w, y: p3.y};
      var bl = {x: p3.x, y: p3.y + h};
      var br = {x: p3.x + w, y: p3.y + h};

      return intersect_line_line(p1, p2, tl, tr) ||
            intersect_line_line(p1, p2, tr, br) ||
            intersect_line_line(p1, p2, br, bl) ||
            intersect_line_line(p1, p2, bl, tl) ||
            false
    }

    return that
  }  
  
    $(document).ready(function() {
        $("#mask").mask("Loading...");

        // The root node anchoring this visualization will be have its Neo4j
        // ID and name as hidden inputs in the page being loaded.
        var root_id = $("#doid").val();
        var root_name = $("#name").val();
        
        var sys = arbor.ParticleSystem({
            repulsion: 10,
            stiffness: 100,
            friction: 0.5,
            gravity: true,
            fps: 30,
            dt: 0.015,
            precision: 0.5
        });
        sys.renderer = Renderer("#viewport");

        $.ajax({
            type: "GET",
            url: NEO4J_QUERY_URL,
            data: "id=" + root_id,
            dataTYpe: "json",
            success: function(data) { 
                addNodesFromDBWithRoot(data, sys, root_id, root_name); 
                $("#mask").unmask();
            }
        });

        $(document).keypress(function(e) {
            if (e.keyCode == 27 && popupStatus == 1) {
                $("#childrenPopup").overlay.close();
            }
        });

    
        $("a[rel]").overlay({mask: '#000'});
        $("#button-some").click(function(e) { addNodesFromSelectList(this.value, sys); });
        $("#button-all").click(function(e) { addNodesFromSelectList(this.value, sys, true) });
    });
})(this.jQuery)
