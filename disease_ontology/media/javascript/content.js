/*********************************************************
Javascript code that handles attaching an event listener
to the onclick function of any of the relationship links
in our term metadata window

author - Cesar Arze
contact - carze@som.umaryland.edu
*********************************************************/

$(document).ready(function() {
    // Super hacky but our CSS sticky footer does not function properly in Opera
    if ($.browser.opera) {
        $(".sticky-footer").css("margin-top", "-82px");
    }

    // Bit of a hack here but if we are viewing the page in IE we want to disable
    // the visualize button because canvas is not supported in IE.
    if ($.browser.msie && $("#arbor_button").length) {
        $("#arbor_button").css("opacity", "0.9");
        $("#arbor_button").attr("disabled", "1");
        $("#arbor_button").css("cursor", "default");
    }

    $(".rel-link").each(function() {
        name = $(this).text();
        doid = this.id;

        $(this).click(function() {
            try {
                parent.addContentTab('rel-' + doid, doid, name, '/term/' + doid);
                return false;
            } catch (err) {
                window.open('/term/' + doid, '_newtab')
            }
        });
    });

    $(".term-search").each(function() {
        $(this).click(function() {
            elts = this.id.split('_', 2);
            tabId = parent.activeTabs.slice(-1)[0];
            parent.displayMetadata(elts[0], elts[1], tabId);
            parent.expandTree(elts[0]);
            return false;
        });
    });

    // Only add listener if our browser is not IE
    if ( !($.browser.msie) ) {
        $("#arbor_button").click(function(e) {
            elts = $(this).children('span').attr('id').split("_");
            parent.addArborTab('visual', elts[0], elts[1]);
            return false;            
        });
    }

    $("#key-arbor").click(function(item) {
        parent.popupArborKey();
    });

    $("tr:.search-row:odd").addClass("odd");
    $("tr:.search-row").hover( function(e) { $(this).addClass("row-hover"); }, function(e) { $(this).removeClass("row-hover"); });

    $("tr:.search-row").click(function(e) {
        // Need to remove this class or hover-over color gets stuck on Firefox
        $(this).removeClass("row-hover");

        elts = this.id.split('_', 2);       
        tabId = parent.activeTabs.slice(-1)[0];
        parent.displayMetadata(elts[0], elts[1], tabId);
        parent.expandTree(elts[0]);
    });

    $("#meta-slider").bxSlider();
});
