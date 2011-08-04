/*********************************************************
Code to produce a search tree and tab-panel container 
to search and display results from the disease ontology
neo4j + lucene index.

author - Cesar Arze
contact - carze@som.umaryland.edu
*********************************************************/

// Array Remove - By John Resig (MIT Licensed)
Array.remove = function(array, from, to) {
  var rest = array.slice((to || from) + 1 || array.length);
  array.length = from < 0 ? array.length + from : from;
  return array.push.apply(array, rest);
};
       
// A global var to keep track of what the active tab index is.
// All metadata results should be piped to this window
var activeTabs = new Array();

// A global var to keep track of how many search tabs we have open
// at a time
var searchTabs = 1

// Keep a global state as to whether or not we want to have our visualiztion
// key popup
var displayKey = true;

// Couple URLs we will use
var BLANK_RESULTS_URL = "/blank_results/";
var WELCOME_URL = "/welcome/";
var TERM_URL = "/term/";
var SEARCH_URL = "/search?";
var ARBOR_URL = "/visual/";

/**
* Given a specific DOID (or ontology ID) expands our tree to the first
* node found
*/
function expandTree(doid) {
    var tree = Ext.getCmp('doTree')
    
    // Need to add an extra parameter to our HTTP request indicatin
    // that we are executing a search
    tree.getLoader().baseParams = { 'search': "True" };
    tree.setRootNode(new Ext.tree.AsyncTreeNode({ id: doid }));
    tree.render()
}

/**
* Function called to add a content tab to the tabpanel. A content tab is
* either a metadata tab requested from search results or the browse tree
* or one of the static pages such as the 'Welcome' and 'New metadata' pages
*/
function addContentTab(tabId, termId, title, url, close) {
    var close = typeof(close) != 'undefined' ? close : true;
    var tabs = Ext.getCmp('tabResults');
    var tabIndex = tabId.slice(-1);

    title = capitalizeMe(title);
    var tgtTab = tabs.find('title', title)

    if (tgtTab.length != 0) {
        tabs.setActiveTab(tgtTab[0]);
    } else {
        var MIF = new Ext.ux.ManagedIFramePanel({
            id: 'mif-' + tabIndex,
            border: false,
            bodyBorder: false,
            defaultSrc: url,
            fitToParent: true
        })
        
        tabs.add({
            id: tabId,
            title: title,
            iconCls: 'metadata',
            layout: 'fit',
            items: MIF,
            closable: close,
            autoScroll: false,
            tabTip: title
        }).show();

        tabs.doLayout();
    }
}

/**
* Takes our form values and serializes them to be passed along 
* to our django and does a little house keeping to close down 
* the advanced search window and reset the 'adv_search' flag 
* if they are enabled
*/
function searchLuceneIndex(searchForm) {
    params = searchForm.serialize();
    advSearch = $("#adv_search_bool").val();

    // Little bit of house-keeping first
    if ( $('#adv-search-div').is(':visible') ) {
        // We need to check both our alternate ID and DOID fields
        // and if a leading 'DOID' is not added to the values 
        // we will want to add it.
        $('.idfield').each(function(id) {
            value = $(this).val()

            if (value != "" && value.search("DOID") == -1) {
                $(this).val("DOID:" + value)
            }
        });

        $('#adv-search-div').hide('fast')
        $('#searchbox').removeAttr('disabled')
        $('#adv_search').val("False")
    } 
    
    addSearchTab(searchTabs, 'Search Results', params, advSearch);
}

/**
* Takes our serialized form and parses out all the individual query
* tokens to build a string out of them that will be displayed in our quicktipe
* for the search tab panel.
*/
function createAdvSearchTooltip(query) {
    var tabTitle = '<span class="adv-tip-header">Advanced Search:</span><br />'
    queryElts = query.split('&');

    for (var i = 0; i < queryElts.length; i++) {
        if (queryElts[i].indexOf('field') != -1) {
            fieldElts = queryElts[i].split('=');
            fieldNum = (fieldElts[0].split('-'))[1];
            val = $("#field-val-" + fieldNum).val();
            tabTitle += "<span class='adv-tip-field'>" + fieldElts[1] + 
                        " = " + val + "</span><br />";
        }
    }

    return tabTitle;
}

/**
* Creates a new tab to house search results from the search functionality 
* on the main page.
*/
function addSearchTab(tabId, title, searchTerms, advSearch) {
    var tabs = Ext.getCmp('tabResults');
    
    // Deal with labeling our search tabs
    var title = "Search Results";
    var quickTip = title;

    // If we are leading with an advanced search here we need
    // to parse out all of our query tokens and display them in 
    // our quicktip
    var searchTerm;
    if (advSearch == "True") {
        title = 'Advanced Search';
        quickTip = createAdvSearchTooltip(searchTerms);
    } else {
        searchTerm = Ext.get("search-field").getValue();
        quickTip = 'Search: ' + searchTerm;
        title = 'Search: ' + capitalizeMe(searchTerm);
    }
    
    var MIF = new Ext.ux.ManagedIFramePanel({
        id: 'mif-search-' + tabId,
        border: false,
        defaultSrc: SEARCH_URL + searchTerms,
        loadMask: {msg: 'Searching...'},
        fitToParent: true
    });

    tabs.add({
        id: 'search-' +tabId,
        title: title,
        iconCls: 'search',
        layout: 'fit',
        items: MIF,
        closable: true,
        tabTip: quickTip
    }).show();

    tabs.doLayout();
    searchTabs++;
}

/**
* Adds or updates a tab panel containing a visual representation of a target 
* node and its relationships using the arbor.js javascript visualization 
* library. 
*
* Only one of these tabs may be open at a time (memory constraints).
*/
function addArborTab(tabId, doid, name) {
    var tabs = Ext.getCmp('tabResults');
    var title = capitalizeMe(name);
    var url = ARBOR_URL + doid + "/" + escape(name);

    if ( tabs.findById(tabId) ) {   
        var activeTab = Ext.getCmp(tabId);

        if (activeTab.title.toLowerCase() != name.toLowerCase()) {          
            var activeMIF = Ext.getCmp('mif-' + tabId);
            
            activeTab.setTitle(title);
            tabs.setActiveTab(tabId);
            activeMIF.setLocation(url); 
        } else {
            tabs.setActiveTab(tabId);
        }
    } else {
        var MIF = new Ext.ux.ManagedIFramePanel({
            id: 'mif-' + tabId,
            border: false,
            bodyBorder: false,
            defaultSrc: url,
            fitToParent: true
        });

        tabs.add({
            id: tabId,
            title: title,
            iconCls: 'visualization',
            layout: 'fit',
            items: MIF,
            closable: true,
            tabTip: 'Visualization: ' + title
        }).show();

        tabs.doLayout();
    }
}

/**
* Display term metadata in the current active tab. The active tab by default
* is the results tab visible on page load but can be changed by use of the
* 'Open new metadata tab' button.
*/
function displayMetadata(nodeId, termName, tabId) {  
    var tabPanel = Ext.getCmp('tabResults');

    if (tabId == undefined) {
        // We are back to just our welcome page and need to add 
        // a new tab
        activeTabs.push('metadata-1');
        addContentTab('metadata-1', nodeId, termName, TERM_URL + nodeId)
    } else {
        var activeTab = Ext.getCmp(tabId);
        
        if (activeTab.title.toLowerCase() != termName.toLowerCase()) {
            var tabIndex = tabId.slice(-1)
            var activeMIF = Ext.getCmp('mif-' + tabIndex);

            tabPanel.setActiveTab(tabId)
            activeTab.setTitle(capitalizeMe(termName));
            activeMIF.setLocation(TERM_URL + nodeId)

            // Update our tab tip
            Ext.fly(activeTab.tabEl).child('span.x-tab-strip-text', true).qtip = 'Metadata: ' + capitalizeMe(termName);
        } else {
            tabPanel.setActiveTab(tabId);
        }
    }
}

/**
* Capitalize the first letter in each word. 
*
* CREDIT: http://psacake.com/web/jc.asp
*/
function capitalizeMe(nodeTitle) {
    var newTitle = '';
    var val = nodeTitle.split(' ');
    
    for(var c=0; c < val.length; c++) {
        newTitle += val[c].substring(0,1).toUpperCase() +
                    val[c].substring(1,val[c].length) + ' ';
    }

    return newTitle.slice(0, -1);
}

/**
* Popup an ExtJS floating window containing a key for our DO - Arbor 
* visualization page
*/
function popupArborKey(posX, posY) {
    win = Ext.WindowMgr.get('arborKey');
        
    if (win && !win.isVisible()) {
        win.show();
    } else if (win && win.isVisible()) {
        win.hide();
    } else {
        var keyWindows = new Ext.Window({
            id: 'arborKey',
            title: 'Visualization Key',
            resizable: false,
            autoLoad: 'arbor_key/',
            width: 326,
            autoHeight: true,
            closeAction: 'hide',
            style: {
                backgroundColor: '#FFFFFF'
            },
            listeners: {
                hide: function(panel) {
                    displayKey = false;
                },
                show: function(panel) {
                    displayKey = true;
                }
            }
                
        }).show();
    }
}

Ext.onReady(function() {
    Ext.QuickTips.init();

    var tb = new Ext.Toolbar();
    tb.add({
        text: 'Open new metadata panel',
        iconCls: 'add',
        listeners: {
            click: function(button, buttonEvnt) {
                var newTabId;
                var newTabIndex = 1;

                if (activeTabs.length > 0) {
                    activeTabIndex = activeTabs.slice(-1)[0].slice(-1);
                    newTabIndex = ++activeTabIndex;
                    newTabId = "metadata-" + newTabIndex;
                } else {
                    // We have no metadata tabs open so just add our first one                        
                    newTabId = "metadata-1";
                }

                activeTabs.push(newTabId)
                addContentTab(newTabId, 'new', 'Metadata ' + newTabIndex, BLANK_RESULTS_URL);
            }
        }
    })

    var tree = new Ext.tree.TreePanel({
        id: 'doTree',
        useArrows: true,
        autoScroll: true,
        animate: true,
        height: 640,
        expanded: true,
        containerScroll: true,
        border: false,
        rootVisible: false,
        // auto create TreeLoader
        loader: {
            dataUrl: 'query_tree',
            requestMethod: 'GET',
            preloadChildren: true,

            listeners: {
                beforeload: function(loader, callback) {
                    // We only want a loading mask when we are searching, otherwise
                    // the mask gets annoying
                    params = tree.getLoader().baseParams;
                    if ('search' in params && params.search == "True") {
                        tree.el.mask('Loading...', 'x-mask-loading');
                    }
                },
                load: function(loader, node, resp) {
                    params = tree.getLoader().baseParams;
                    if ('search' in params && params.search == "True") {
                        root = tree.getRootNode();
                        searchNode = tree.getNodeById(root.id);
                        searchNode.ensureVisible();
                        searchNode.select();

                        // Reset our baseParams to nothing so that the user can drill 
                        // down into the tree from what we returned
                        tree.getLoader().baseParams = {};
                    }

                    tree.el.unmask();
                }
            }
        },

        tbar: tb,

        root: {
            nodeType: 'async',
            text: 'Ext JS',
            draggable: false,
            id: 'root'
        }

    });

    tree.on('click', function(node, eventObj) {
        activeTabId = activeTabs.slice(-1)[0]
        displayMetadata(node.id, node.attributes.text, activeTabId);
    });

    var searchResultsTabs = new Ext.TabPanel({
        id: 'tabResults',
        resizeTabs: true,
        enableTabScroll: true,
        minTabWidth: 115,
        height: 680,
        tabWidth: 135,
        enableTabScroll: true,
        defaults: {
            autoScroll:true,
            preventBodyReset: true
        },
     
        listeners: {
            beforeremove: function(panel, component) {
                componentId = component.id
                if (componentId.indexOf('metadata-') != -1) {
                    arrPos = activeTabs.indexOf(componentId);
                    Array.remove(activeTabs, arrPos);
                }

                // Double check to see if our Key window is open 
                // and if so close it
                if (componentId == 'mif-visual') {
                    win = Ext.WindowMgr.get('arborKey');
                    if (win) { win.hide(); }
                }
            },
            beforetabchange: function(tabPanel, newPanel, currPanel) {
                var win = Ext.WindowMgr.get('arborKey');
                var treeNav = Ext.getCmp('treeNav');

                // If the user navigates away from the visualization tab 
                // we want to close the key if it is visible.
                if (currPanel && currPanel.getId() == 'visual') {
                    treeNav.expand(true);

                    if (win && displayKey && win.isVisible()) { 
                        win.hide();
                        displayKey = true;
                    } 
                }

                // When switching to a visualization tab if the user has not 
                // closed down the key we want to display it
                if (newPanel && newPanel.getId() == 'visual') {
                    treeNav.collapse(true);

                    if (displayKey && win) {
                        win.show();
                    }
                }
            }
        },
       
        plugins: new Ext.ux.TabCloseMenu()

    });

    // Want to have a sort of 'Welcome' tab with news and other junks.
    addContentTab('welcome-0', 'welcome', 'Welcome', WELCOME_URL, false);
    searchResultsTabs.setActiveTab(0);
    
    var container = new Ext.Panel({
        id: 'doContainer',
        layout: 'border',
        bodyBorder: true,
        renderTo: 'search-results',
        height: 680,
        defaults: {
            collapsible: false,
            useSplitTips: false,
            split: false,
        },
     
        items: [{
            id: 'treeNav',
            title: 'Navigation',
            region: 'west',
            width: 250,
            minWidth: 250,
            maxWidth: 250,
            margins: '5 5 5 5',
            hideCollapseTool: true,
            collapsible: true,
            collapseMode: 'mini',
            cmargins: '5 0 0 0',
            items: tree,
            toggleGroup: Ext.emptyFn
        },{
            collapsible: false,
            region: 'center',
            margins: '5 5 5 0',
            items: [{ 
                xtype: 'panel',
                region: 'center',
                layout: 'fit',
                bodyBorder: false,
                border: false,
                header: false,
                hideBorders: true,
                items: searchResultsTabs
            }]
        }]
    });
})
