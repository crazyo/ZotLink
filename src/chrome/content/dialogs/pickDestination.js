var ZotLink_Pick_Destination_Dialog = new function() {
    // public methods
    this.init = init;
    this.accept = accept;
    this.updateCollections = updateCollections;

    // private methods/properties
    this._linkType = null;
    this._source = null;
    this._librarySelections = [];
    this._collectionSelections = [];


    function init() {
        var io = window.arguments[0];
        // set link type, default to item
        this._linkType = io.linkType || "item";
        // set source
        this._source = io.source || null;

        // set dialog header
        var header;
        switch (this._linkType) {
            case "item":
                header = "pick destination library and collection for the new item";
                break;
            case "collection":
                header = "pick destination library and parent collection for the new collection";
                break;
        }
        document.getElementById("header").setAttribute("description", header);

        var libraryList = document.getElementById("destination-library-menupopup");
        var groups = Zotero.Groups.getAll();
        var library;

        // add my library
        library = document.createElement("menuitem");
        library.setAttribute("label", "My Library");
        libraryList.appendChild(library);
        // use 0 as the special library id for My Library
        this._librarySelections.push(0);

        // add group libraries
        for (var i = 0; i < groups.length; i++) {
            library = document.createElement("menuitem");
            library.setAttribute("label", groups[i].name);
            libraryList.appendChild(library);
            this._librarySelections.push(groups[i].libraryID);
        }

        // select the first library by default
        if (this._librarySelections) {
            document.getElementById("destination-library-menulist").selectedIndex = 0;
        }
        // set the corresponding collections
        this.updateCollections();
    }

    function accept() {
        // send out the picked library id and collection id
        var io = window.arguments[0];
        var destLibraryID = this._librarySelections[document.getElementById("destination-library-menulist").selectedIndex];
        var destCollectionID = this._collectionSelections[document.getElementById("destination-collection-menulist").selectedIndex];
        io.out = {accepted: true,
                  destLibraryID: destLibraryID,
                  destCollectionID: destCollectionID};
    }

    function updateCollections() {

        function _add(collectionid, level, disabled) {
            var dialog = ZotLink_Pick_Destination_Dialog;
            // get collection
            var collection = Zotero.Collections.get(collectionid);
            if (!collection) return;
            // add current collection
            var element = document.createElement("menuitem");
            var label = new Array(level).join("    ") + collection.name;
            element.setAttribute("label", label);
            if (dialog._linkType === "collection") {
                // when creating collection link
                //   destination collection cannot be:
                //     itself, its sub-collections, its relatives or its relatives' sub-collections
                var excludedCollectionIDs = Zotero.ZotLink.DBManager.getCollectionRelatives(dialog._source.id);
                excludedCollectionIDs.push(dialog._source.id);
                if (excludedCollectionIDs.indexOf(collectionid) > -1) disabled = true;
            }
            else if (dialog._linkType === "item") {
                // when creating item link
                //   destination collection cannot:
                //     contain the current item or a linked item of the current item
                var exclusiveItemIDs = Zotero.ZotLink.DBManager.getItemLinks(dialog._source.id);
                exclusiveItemIDs.push(dialog._source.id);
                disabled = false;
                for (var i = 0; i < exclusiveItemIDs.length; i++) {
                    if (Zotero.Items.get(exclusiveItemIDs[i]).inCollection(collectionid)) {
                        disabled = true;
                        break;
                    }
                }
            }
            element.setAttribute("disabled", !!disabled);
            document.getElementById("destination-collection-menupopup").appendChild(element);
            dialog._collectionSelections.push(collectionid);
            // add its sub-collections
            var sub = collection.getChildCollections(true);
            for (var i = 0; i < sub.length; i++) {
                _add(sub[i], level + 1, disabled);
            }
        }

        var selectedLibraryID = this._librarySelections[document.getElementById("destination-library-menulist").selectedIndex];
        var collectionList = document.getElementById("destination-collection-menupopup");
        var collection;

        // reset collection list menu
        while (collectionList.firstChild) {
            collectionList.removeChild(collectionList.firstChild);
        }
        // reset legacy _collectionSelections list
        this._collectionSelections = [];

        // add root
        collection = document.createElement("menuitem");
        collection.setAttribute("label", "<root>");
        collectionList.appendChild(collection);
        // use 0 as the special collection id for library root
        this._collectionSelections.push(0);

        // add other collections
        // step 1. retrieve collections from db
        var sql = "SELECT collectionID FROM collections WHERE libraryID";
        // case 1. My Library
        if (selectedLibraryID === 0) {
            sql += " IS NULL;";
        }
        // case 2. group libraries
        else {
            sql += "=" + selectedLibraryID;
        }
        var rows = Zotero.DB.columnQuery(sql);
        // step 2. add them
        for (var i = 0; i < rows.length; i++) {
            var id = parseInt(rows[i]);
            // skip sub-collections, they will be taken care of by their parents
            if (Zotero.Collections.get(id).parent) continue;
            _add(id, 1);
        }

        // select the first item by default
        if (this._collectionSelections) {
            document.getElementById("destination-collection-menulist").selectedIndex = 0;
        }
    }
};
