var ZotLink_Manage_Item_Links_Dialog = new function() {
    this.init = init;
    this.unlink = unlink;

    function init() {
        var item = window.arguments[0].item;

        document.getElementById("item-name").setAttribute("value", item.getDisplayTitle());
        document.getElementById("item-type").setAttribute("value", Zotero.ItemTypes.getName(item.itemTypeID));

        _updateLinksListbox();
    }

    function _updateLinksListbox() {
        // clear listbox first
        var listbox = document.getElementById("links-listbox");
        var olds = listbox.getElementsByTagName("listitem");
        for (var i = olds.length - 1; i >= 0; i--) {
            listbox.removeChild(olds[i]);
        }
        // refill
        var links = Zotero.ZotLink.DBManager.getItemLinks(window.arguments[0].item.id);
        for (var i = 0; i < links.length; i++) {
            var linkItem = Zotero.Items.get(links[i]);
            var row = document.createElement("listitem");
            // item id
            var cell = document.createElement("listcell");
            cell.setAttribute("label", links[i]);
            row.appendChild(cell);
            // item title
            cell = document.createElement("listcell");
            cell.setAttribute("label", linkItem.getDisplayTitle());
            row.appendChild(cell);
            // library
            cell = document.createElement("listcell");
            cell.setAttribute("label", linkItem.libraryID ? Zotero.Libraries.getName(linkItem.libraryID) : "My Library");
            row.appendChild(cell);
            // collections
            var collections = [];
            var collectionids = linkItem.getCollections();
            for (var j = 0; j < collectionids.length; j++) {
                collections.push(Zotero.Collections.get(collectionids[j]).name);
            }
            cell = document.createElement("listcell");
            cell.setAttribute("label", collections.toString());
            row.appendChild(cell);
            row.setAttribute("value", links[i]);
            listbox.appendChild(row);
        }
    }

    function unlink() {
        var selectedLink = document.getElementById("links-listbox").selectedItem;
        if (!selectedLink) return;
        Zotero.ZotLink.DBManager.deleteItemLink(window.arguments[0].item.id, parseInt(selectedLink.value));
        _updateLinksListbox();
    }
};
