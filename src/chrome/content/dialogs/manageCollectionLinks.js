var ZotLink_Manage_Collection_Links_Dialog = new function() {
    this.init = init;
    this.unlink = unlink;

    function init() {
        var collection = window.arguments[0].collection;

        document.getElementById("collection-name").setAttribute("value", collection.name);
        document.getElementById("collection-library").setAttribute("value", collection.libraryID ? Zotero.Libraries.getName(collection.libraryID) : "My Library");
        document.getElementById("collection-parent").setAttribute("value", collection.parent ? Zotero.Collections.get(collection.parent).name : "root");

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
        var links = Zotero.ZotLink.DBManager.getCollectionLinks(window.arguments[0].collection.id);
        for (var i = 0; i < links.length; i++) {
            var linkCollection = Zotero.Collections.get(links[i]);
            var row = document.createElement("listitem");
            // collection id
            var cell = document.createElement("listcell");
            cell.setAttribute("label", links[i]);
            row.appendChild(cell);
            // collection name
            cell = document.createElement("listcell");
            cell.setAttribute("label", linkCollection.name);
            row.appendChild(cell);
            // library
            cell = document.createElement("listcell");
            cell.setAttribute("label", linkCollection.libraryID ? Zotero.Libraries.getName(linkCollection.libraryID) : "My Library");
            row.appendChild(cell);
            // parent collection
            cell = document.createElement("listcell");
            cell.setAttribute("label", linkCollection.parent ? Zotero.Collections.get(linkCollection.parent).name : "root");
            row.appendChild(cell);

            row.setAttribute("value", links[i]);
            listbox.appendChild(row);
        }
    }

    function unlink() {
        var selectedLink = document.getElementById("links-listbox").selectedItem;
        if (!selectedLink) return;
        Zotero.ZotLink.DBManager.deleteCollectionLink(window.arguments[0].collection.id, parseInt(selectedLink.value));
        _updateLinksListbox();
    }
};
