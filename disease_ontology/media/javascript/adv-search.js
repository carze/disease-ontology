/**
Creates a pop-up advanced search window that can be used to query the disease
ontology Lucene index.
**/

// An array to keep track of all the fields we have in our advanced search 
// drop down
var fieldsArray = ["search-field-container-1"];

$(document).ready(function() {
    $("#advanced_search").click(function() {
        form = $("#adv-search-div");

        if ( form.is(":visible") ) {
            form.hide('fast')
            
            $("#searchbox").removeAttr("disabled")
            $("#adv_search").val("False")
        } else {
            form.show('fast')
            
            // Once the advanced field is slid open we want to disable the 
            // "all" search bar
            $("#searchbox").attr("disabled", "disabled")                
            
            // We also need to set the form value 'adv_search' to True
            // so that our backend script knows we are dealing with an 
            // advanced search
            $("#adv_search").val("True")
        }
    });

    // Remove a field 
    $(".remove-field").live("click", function() {
        if (fieldsArray.length > 1) {
            parentDiv = $(this).parent();
            fieldsArrayIdx = fieldsArray.indexOf(parentDiv.attr('id'));
            Array.remove(fieldsArray, fieldsArrayIdx);

            // If we are left with just one field after removing the clicked
            // field we want to remove our delete button
            if (fieldsArray.length == 1) {
                $("#" + fieldsArray[0]).children(".remove-field").remove();
            }

            parentDiv.remove();
        }
    });

    $("#add-field").click(function() {
        var divId = fieldsArray[fieldsArray.length - 1];
        var elts = divId.split('-');
        var divNumber = elts[elts.length - 1];
        var newDivNumber = parseInt(divNumber) + 1;
        fieldsArray.push("search-field-container-" + newDivNumber);

        // Need to add a delete button to our original field
        if (fieldsArray.length == 2) {
            $("#field-val-" + divNumber).after("<img class=\"remove-field\" src=\"/media/images/cross.png\"/>");
        }

        var newElem = $("#" + divId).clone().attr("id", "search-field-container-" + newDivNumber);
        newElem.children(".dynamic-field").each(function() {
            var child = $(this);
            oldId = child.attr('id');
            oldName = child.attr('name');

            newId = oldId.replace(divNumber, newDivNumber);
            newName = oldName.replace(divNumber, newDivNumber);
            child.attr("id", newId).attr("name", newName);
            child.val("");
        });

        // Clear out the value field of our new field
        newElem.children("#field-val-" + divNumber).val("");

        $("#search-field-container-" + divNumber).after(newElem);

        // Add our jquery validation to our form
        $("#search").validationEngine({scroll: false});
    });
});
