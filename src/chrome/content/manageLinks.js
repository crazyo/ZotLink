var ZotLink_Manager = new function() {
    this.init = init;
    // this.modifyLink = modifyLink;
    this.deleteLink = deleteLink;

    function init() {
        var item = window.arguments[0].item;

        document.getElementById("item-name").setAttribute("value", item.getDisplayTitle());
        document.getElementById("item-type").setAttribute("value", Zotero.ItemTypes.getName(item.itemTypeID));

        updateLinksPool();
    }

    function updateLinksPool() {
        // clear pool first
        var pool = document.getElementById("links-pool");
        var olds = pool.getElementsByTagName("listitem");
        for (var i = olds.length - 1; i >= 0; i--) {
            pool.removeChild(olds[i]);
        }
        // refill
        var links = Zotero.ZotLink.links.findLinks(window.arguments[0].item.id);
        for (var i = 0; i < links.length; i++) {
            var linkItem = Zotero.Items.get(links[i]);
            var row = document.createElement("listitem");
            var cell = document.createElement("listcell");
            cell.setAttribute("label", links[i]);
            row.appendChild(cell);
            cell = document.createElement("listcell");
            cell.setAttribute("label", linkItem.libraryID ? Zotero.Libraries.getName(linkItem.libraryID) : "My Library");
            row.appendChild(cell);
            row.setAttribute("value", links[i]);
            pool.appendChild(row);
        }
    }

    // function modifyLink() {
    //     var selectedLink = document.getElementById("links-pool").selectedItem;
    //     if (!selectedItem) return;
    //     Zotero.ZotLink.modifyLink(window.arguments[0].item.id, selectedLink.value);
    // }

    function deleteLink() {
        var selectedLink = document.getElementById("links-pool").selectedItem;
        if (!selectedLink) return;
        Zotero.ZotLink.deleteLink(window.arguments[0].item.id, parseInt(selectedLink.value));
        updateLinksPool();
    }
};
