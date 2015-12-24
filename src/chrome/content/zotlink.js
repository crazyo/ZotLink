Zotero.ZotLink = {
    DB: null,
    // cache database invoking result to reduce database-access overhead
    links: null,

    // current observerID
    observerID: null,

    // services
    ps: Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                  .getService(Components.interfaces.nsIPromptService),


    init: function() {
        // connect to the database (create if necessary)
        this.DB = new Zotero.DBConnection("zotlink");
        if (!this.DB.tableExists("links")) {
            this.DB.query("CREATE TABLE links (item1id INT, item2id INT);");
        }

        // retrieve data from database, store in cache
        var sql = "SELECT * FROM links;";
        var rows = this.DB.query(sql);
        this.links = new _LinkGraph(rows);

        // start listening to events
        this.observerID = Zotero.Notifier.registerObserver(this.observer, ["item"]);

        // stop listening to events when unloaded
        window.addEventListener("unload", function() {
            Zotero.Notifier.unregisterObserver(this.observerID);
        });
    },

    observer: {
        notify: function(event, type, ids, extra) {
            // keep a reference to our ZotLink object
            var zotlink = Zotero.ZotLink;

            if (event === "delete") {
                // update db
                var sql = "DELETE FROM links WHERE item1id IN (" + ids + ") OR item2id IN (" + ids + ");";
                zotlink.DB.query(sql);
                // also update the cache to reduce database access
                for (var i = 0; i < ids.length; i++) {
                    zotlink.links.removeLinks(ids[i]);
                }
            }
            else if (event === "modify") {
                // loop over changed items
                for (var i = 0; i < ids.length; i++) {
                    // get the changed item
                    var id = ids[i];
                    var source = Zotero.Items.get(id);

                    // change all items that are linked to this item
                    var targets = zotlink.links.findLinks(id);
                    for (var j = 0; j < targets.length; j++) {
                        var target = Zotero.Items.get(targets[j]);

                        // temporarily stop listening to events
                        Zotero.Notifier.unregisterObserver(zotlink.observerID);

                        // update the target
                        source.clone(false, target);
                        target.save();

                        // resume listening to events
                        zotlink.observerID = Zotero.Notifier.registerObserver(zotlink.observer, ["item"]);
                    }
                }
            }
        },
    },

    promptCreateLink: function() {
        // get selected items
        var selectedItems = ZoteroPane_Local.getSelectedItems();
        // get destination library id and collection id
        var io = {};
        window.openDialog("chrome://zotlink/content/pickLinkDestination.xul",
                          "",
                          "chrome,centerscreen,modal,resizable=no",
                          io);
        var result = io.out;
        // do nothing if user hit cancel
        if (!result || !result.accepted) {
            return;
        }
        // do the actual job
        for (var i = 0; i < selectedItems.length; i++) {
            this.createLinkedCopy(selectedItems[i], result.destLibraryID, result.destCollectionID);
        }
    },

    createLinkedCopy: function(source, destLibraryID, destCollectionID) {
        // temporarily stop listening to events
        Zotero.Notifier.unregisterObserver(this.observerID);

        // 1. make a copy at the target location
        var newItem, newItemID;

        newItem = new Zotero.Item(source.itemTypeID);
        // add the item to the target library
        newItem.libraryID = destLibraryID || null;
        newItemID = newItem.save();
        newItem = Zotero.Items.get(newItemID);
        // copy over all the information
        source.clone(false, newItem);
        newItem.save();
        // add the item to the target collection
        if (destCollectionID) {
            Zotero.Collections.get(destCollectionID).addItem(newItemID);
        }

        // 2. link them
        // update db
        var sql = "INSERT INTO links VALUES (" + source.id + ", " + newItemID + ");";
        this.DB.query(sql);
        // also update the cache to reduce database access
        this.links.addLink([source.id, newItemID]);

        // resume listening to events
        this.observerID = Zotero.Notifier.registerObserver(this.observer, ["item"]);
    },

    promptLinkExisting: function() {
        // get selected items
        var selectedItems = ZoteroPane_Local.getSelectedItems();
        // only allow single selection
        if (selectedItems.length > 1) {
            this.ps.alert(null,
                          "Multiple Selections Not Allowed",
                          "Only one source item is allowed at a time!");
            return;
        }
        // source item to link to
        var source = selectedItems[0];

        // select target items
        var io = {};
        window.openDialog("chrome://zotero/content/selectItemsDialog.xul", "", "chrome,modal", io);
        var targets = io.dataOut;
        // do nothing if user hit cancel or didn't select any item
        if (!targets || !targets.length) {
            return;
        }

        // confirm
        var confirmed = this.ps.confirm(null,
                                        "Are You Sure You Want to Continue?",
                                        "The selected target items will be OVERWRITTEN by the source item.\n" +
                                        "Make sure you already have important information backed-up!");
        if (!confirmed) {
            return;
        }

        // do the actual job
        for (var i = 0; i < targets.length; i++) {
            this.linkExistingItem(source, Zotero.Items.get(targets[i]));
        }
    },

    linkExistingItem: function(source, target) {
        // 1. check if linking is allowed
        // i> target and source cannot be the same item
        if (source.id === target.id) {
            this.ps.alert(null,
                          "Cannot Link Item to Itself",
                          "Source item and target item cannot be the same item!\n" +
                          "source: " + source.id + "; target: " + target.id);
            return;
        }
        // ii> target and source cannot already be linked
        var existingLinks = this.links.findLinks(source.id);
        if (existingLinks && existingLinks.length) {
            for (var i = 0; i < existingLinks.length; i++) {
                if (existingLinks[i] === target.id) {
                    this.ps.alert(null,
                                  "Cannot Link Already Linked Items",
                                  "Source item and target item are already linked!\n" +
                                  "source: " + source.id + "; target: " + target.id);
                    return;
                }
            }
        }
        // iii> target and source must be of the same item type
        if (target.itemTypeID !== source.itemTypeID) {
            this.ps.alert(null,
                          "Cannot Link Different Types of Items",
                          "Source item and target item must be of the same type!\n" +
                          "source: " + source.id + "; target: " + target.id);
            return;
        }

        // temporarily stop listening to events
        Zotero.Notifier.unregisterObserver(this.observerID);

        // 2. update target information
        source.clone(false, target);
        target.save();

        // 3. link them
        // update db
        var sql = "INSERT INTO links VALUES (" + source.id + ", " + target.id + ");";
        this.DB.query(sql);
        // also update the cache to reduce database access
        this.links.addLink([source.id, target.id]);

        // resume listening to events
        this.observerID = Zotero.Notifier.registerObserver(this.observer, ["item"]);
    },
};

window.addEventListener("load", function() { Zotero.ZotLink.init(); });


/* implementation of graph data structure where nodes are the items and
 * edges are the links
 */
function _LinkGraph(pairs) {
    // the graph inner representation of the linked items (will build later)
    this.graph = {};

    // connect linked pair in the graph
    this.addLink = function(pair) {
        var item1id = pair[0],
            item2id = pair[1];

        if (!this.graph.hasOwnProperty(item1id)) {
            this.graph[item1id] = [item2id];
        }
        else {
            this.graph[item1id].push(item2id);
        }
        if (!this.graph.hasOwnProperty(item2id)) {
            this.graph[item2id] = [item1id];
        }
        else {
            this.graph[item2id].push(item1id);
        }
    };

    // find id of all linked items to the given item using BFS
    this.findLinks = function(itemid) {
        var tovisit = [itemid],
            visted  = [];

        while (tovisit.length) {
            var current = tovisit.shift();
            visted.push(current);

            if (!this.graph[current]) {
                continue;
            }

            for (var i = 0; i < this.graph[current].length; i++) {
                var candidate = this.graph[current][i];
                if (tovisit.indexOf(candidate) === -1 &&
                    visted.indexOf(candidate)  === -1) {
                    tovisit.push(candidate);
                }
            }
        }

        // the first item in the visited list is the given item itself
        visted.shift();
        return visted;
    };

    // remove all links to the item
    this.removeLinks = function(itemid) {
        if (!this.graph[itemid]) {
            return;
        }

        delete this.graph[itemid];
        for (var source in this.graph) {
            // skip if the current property is not an item
            if (!this.graph.hasOwnProperty(source)) {
                continue;
            }

            for (var j = 0; j < this.graph[source].length; j++) {
                if (this.graph[source][j] === itemid) {
                    this.graph[source].splice(j, 1);
                    break;
                }
            }
            // delete the list if it becomes empty
            if (!this.graph[source].length) {
                delete this.graph[source];
            }
        }
    };

    // build graph (as an adjacency list)
    this._buildGraph = function(pairs) {
        // connect all pairs that are linked and that is our graph
        for (var i = 0; i < pairs.length; i++) {
            this.addLink([pairs[i].item1id, pairs[i].item2id]);
        }
    };
    this._buildGraph(pairs);
}
