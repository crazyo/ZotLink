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
    // do not display zotlink item menu if no item is selected or multiple items are selected
    if (selectedItems.length !== 1) {
        document.getElementById("zotlink-itemmenu").hidden = true;
        return;
    }

    var selectedItem = selectedItems[0];

    // do not display zotlink item menu if the selected item is attachment/note
    if (selectedItem.isAttachment() || selectedItem.isNote()) {
        document.getElementById("zotlink-itemmenu").hidden = true;
        return;
    }

    /****************************
     * manage item links option *
     ****************************/
    // disable this option if the selected item is not linked to any other item
    document.getElementById("zotlink-manage-item-links").setAttribute(
        "disabled",
        !Zotero.ZotLink.DBManager.getItemLinks(selectedItem.id).length ? true : false
    );
});

// collection-menu pop-up showing
document.getElementById("zotero-collectionmenu").addEventListener("popupshowing", function() {
    document.getElementById("zotlink-collectionmenu").hidden = ZoteroPane.getSelectedCollection() ? false : true;

    document.getElementById("zotlink-manage-collection-links").setAttribute(
        "disabled",
        !Zotero.ZotLink.DBManager.getCollectionLinks(ZoteroPane.getSelectedCollection().id).length ? true : false
    );
    // only show dev options in debug mode
    if (ZOTLINK_SETTINGS.DEBUG) document.getElementById("zotlink-collectionmenu-dev").hidden = false;
});

});
