var ZotLink_Destination_Picker = new function() {
    // public methods
    this.init = init;
    this.accept = accept;

    // private methods/properties
    this.updateCollections = updateCollections;
    this._librarySelections = [];
    this._collectionSelections = [];


    function init() {
        var libraryList = document.getElementById("zotlink-destination-library-list");
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
            document.getElementById("zotlink-destination-library-list-menu").selectedIndex = 0;
        }
        // set the corresponding collections
        this.updateCollections();
    }

    function accept() {
        // send out the picked library id and collection id
        var io = window.arguments[0];
        var destLibraryID = this._librarySelections[document.getElementById("zotlink-destination-library-list-menu").selectedIndex];
        var destCollectionID = this._collectionSelections[document.getElementById("zotlink-destination-collection-list-menu").selectedIndex];
        io.out = {accepted: true,
                  destLibraryID: destLibraryID,
                  destCollectionID: destCollectionID};
    }

    function updateCollections() {
        var selectedLibraryID = this._librarySelections[document.getElementById("zotlink-destination-library-list-menu").selectedIndex];
        var collectionList = document.getElementById("zotlink-destination-collection-list");
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
        // step 1. retrieve collection information from db
        var sql = "SELECT * FROM collections WHERE libraryID";
        // case 1. My Library
        if (selectedLibraryID === 0) {
            sql += " IS NULL;";
        }
        // case 2. group libraries
        else {
            sql += "=" + selectedLibraryID;
        }
        var rows = Zotero.DB.query(sql);
        // step 2. add them
        for (var i = 0; i < rows.length; i++) {
            collection = document.createElement("menuitem");
            collection.setAttribute("label", rows[i].collectionName);
            collectionList.appendChild(collection);
            this._collectionSelections.push(rows[i].collectionID);
        }

        // select the first item by default
        if (this._collectionSelections) {
            document.getElementById("zotlink-destination-collection-list-menu").selectedIndex = 0;
        }
    }
};
