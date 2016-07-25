window.addEventListener("load", function() {

// item-menu pop-up showing
document.getElementById("zotero-itemmenu").addEventListener("popupshowing", function() {

    // show ZotLink item menu first
    document.getElementById("zotlink-itemmenu").hidden = false;
    // only show dev options in debug mode
    if (ZOTLINK_SETTINGS.DEBUG) document.getElementById("zotlink-itemmenu-dev").hidden = false;

    var selectedItems = ZoteroPane.getSelectedItems();

    /***********************************
     * visibility of zotlink item menu *
     ***********************************/
    // do not display zotlink item menu if no item is selected
    if (selectedItems.length < 1) {
        document.getElementById("zotlink-itemmenu").hidden = true;
        return;
    }

    // do not display zotlink item menu if at least one of the selected items is attachment/note
    for (var i = 0; i < selectedItems.length; i++) {
        if (selectedItems[i].isAttachment() || selectedItems[i].isNote()) {
            document.getElementById("zotlink-itemmenu").hidden = true;
            return;
        }
    }

    /****************************
     * manage item links option *
     ****************************/
    // do not display this option if multiple items are selected or the selected item is an attachment/note
    if (selectedItems.length > 1 ||
        selectedItems[0].isAttachment() ||
        selectedItems[0].isNote()) {
        document.getElementById("zotlink-manage-item-links").hidden = true;
    }
    else {
        document.getElementById("zotlink-manage-item-links").hidden = false;
        // disable this option if the selected item is not linked to any other item
        document.getElementById("zotlink-manage-item-links").setAttribute(
            "disabled",
            !Zotero.ZotLink.DBManager.getItemLinks(selectedItems[0].id).length ? true : false
        );
    }

    /****************************************
     * merge and link existing items option *
     ****************************************/
    // do not display this option if multiple items are selected
    document.getElementById("zotlink-merge-link-existing-items").parentNode.hidden = selectedItems.length > 1 ? true : false;
});

// collection-menu pop-up showing
document.getElementById("zotero-collectionmenu").addEventListener("popupshowing", function() {
    document.getElementById("zotlink-collectionmenu").hidden = ZoteroPane.getSelectedCollection() ? false : true;
});

});
