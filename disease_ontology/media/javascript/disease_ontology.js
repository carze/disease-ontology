/**
* Some useful jquery functions for the disease ontology website
*/

var myMessages = ['info','warning'];

function hideAllMessages() {
    var messagesHeights = new Array(); // this array will store height for each

    for (i=0; i<myMessages.length; i++) {
       messagesHeights[i] = $('.' + myMessages[i]).outerHeight(); // fill array
       $('.' + myMessages[i]).css('top', -messagesHeights[i]); //move element outside viewport
    }
}

$(document).ready(function() {
    $("#search-field").attr("autocomplete", "off");

    // Firefox hack...
    $("#search-button").removeAttr("disabled");
    $("#search-field").removeAttr("disabled");
    $("#adv-search").removeAttr("disabled");
 
    // Opera hack..
    if ($.browser.opera) {
        $("#adv-search-footer").css("margin-top", "-55px");
    }
    
    // Figure out what page we are on and set our nifty gray transparency 
    // over that menu item
    $("#nav a").each(function(item) {
        var url = "http://" + $(location).attr('host') + $(this).attr('href');
        
        if (url == $(location).attr('href')) {
            $(this).addClass('current');
        }
    });

    // Make the box containing our social icons transparent using the
    // jquery Transify plugin
    $("#social").transify();
    $("#social").css('position', 'absolute');

    $(".submit-button").click(function() {
        if ( $("#search").validationEngine('validate') ) {
            searchLuceneIndex( $("#search") );
            $("#adv-search").overlay().close();
        }

        return false;
    });

    $(".input").bind('keypress', function(e) {
        if (e.keyCode == 13) {
            // Make sure our validation passes...
            if ( $("#search").validationEngine('validate') ) {
                $("#adv-search").overlay().close();
                searchLuceneIndex( $("#search") );
            }

            return false;
        }
    });

    // When the user clicks on the advanced search button an overlay 
    // will come up and we will disable all our buttons.
    if ( $("#adv-search").length ) {
        $("#adv-search").click(function(e) {
            $("#adv_search_bool").val("True");

            $("#search-button").attr("disabled", "disabled");
            $("#search-button").css("opacity", 0.4);
            $("#search-field").attr("disabled", "disabled");
            $("#search-field").css("opacity", 0.4);
            $(this).attr("disabled", "disabled");
            $(this).css("opacity", 0.4);

            // When our advanced search overlay is brought up we want to remove
            // validation from our basic search bar
            $("#search-field").removeClass("validate[required,funcCall[doCheckLuceneQueryValue]]");
        });

        $("#adv-search").overlay({ 
            fixed: false,
            onClose: function() {
                $("#adv_search_bool").val("False");

                $("#search-button").removeAttr("disabled");
                $("#search-button").css("opacity", 1);
                $("#search-field").removeAttr("disabled");
                $("#search-field").css("opacity", 1);
                $("#adv-search").removeAttr("disabled");
                $("#adv-search").css("opacity", 1);

                // Add back our validation field to the basic search bar
                $("#search-field").addClass("validate[required,funcCall[doCheckLuceneQueryValue]]");

                // Hide all validation errors when closing
                $("#search").validationEngine('hideAll');
            }
        });
    }
    
    // A notification for any IE users that visualization does not work in IE        
    if ($.browser.msie) {        
        // We track when someone has closed this notifcation and keep it out of the way
        // via a cookie
        if ( !($.cookie('do_notification')) ) {
            $.cookie('do_notification', "false", { expires: 1, path: '/' });
        }

        $(".message").click(function() {
            $(this).animate({top: -$(this).outerHeight()}, 500);
            $.cookie('do_notification', "true", { expires: 1, path: '/' });
        });

        if ($.cookie('do_notification') == "false") {               
            $("#ie-notifications").show();
            $(".warning").animate({top: "0"}, 500);
        }
    }        

    // Handle the closing of our error div on the contact page
    if ($("#error_div")) {
        $("#error_close_button").click(function() {
            $("#error_div").remove();                
        });
    }
});
