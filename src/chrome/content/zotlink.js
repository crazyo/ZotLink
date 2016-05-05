Zotero.ZotLink = {
    // dev
    _DEBUG: true,
    log: function(string) {
        if (this._DEBUG) console.log(string);
    },
    __dev__logUsedFields: function() {
        this.log(ZoteroPane.getSelectedItems()[0].getUsedFields(true));
    },
    //////////////////////////////////////////////

    DB: null,
    // cache database invoking result to reduce database-access overhead
    links: null,

    // current observerID
    observerID: null,
    // types to observe
    typesToObserve: ["item"],

    // additional fields
    additionalFields: {
        // start from -1 downwards so as not to conflict with regular field ids
        Creators: {name: "Creators", id: -1},
        Tags: {name: "Tags", id: -2},
    },

    // services
    ps: Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                  .getService(Components.interfaces.nsIPromptService),


    init: function() {
        this.log("initializing...");

        // connect to the database (create if necessary)
        this.DB = new Zotero.DBConnection("zotlink");
        // lock the database
        // IMPORTANT: during runtime of the plugin, the database and the cache are always in sync thanks to this lock
        if(!this._DEBUG) this.DB.query("PRAGMA locking_mode=EXCLUSIVE");
        // create tables during first invoke
        if (!this.DB.tableExists("links")) {
            this.DB.query("CREATE TABLE links (id INTEGER PRIMARY KEY AUTOINCREMENT, item1id INT NOT NULL, item2id INT NOT NULL, UNIQUE (item1id, item2id));");
        }
        if (!this.DB.tableExists("linkFields")) {
            this.DB.query("CREATE TABLE linkFields (linkid INT NOT NULL UNIQUE, fieldids BLOB NOT NULL, FOREIGN KEY (linkid) REFERENCES links(id));");
        }

        // retrieve link relationship from database, store in cache
        var sql = "SELECT item1id, item2id FROM links;";
        var rows = this.DB.query(sql);
        this.links = new _LinkGraph(rows);

        // start listening to events
        // TODO: probably more types are needed
        this.observerID = Zotero.Notifier.registerObserver(this.observer, this.typesToObserve);

        // stop listening to events when unloaded
        window.addEventListener("unload", function() {
            Zotero.Notifier.unregisterObserver(this.observerID);
        });

        // other event listeners

        // item-menu pop-up showing
        document.getElementById("zotero-itemmenu").addEventListener("popupshowing", function() {

            // show ZotLink item menu first
            document.getElementById("zotlink-itemmenu").hidden = false;
            // only show dev options in debug mode
            if (Zotero.ZotLink._DEBUG) document.getElementById("zotlink-itemmenu-dev").hidden = false;

            var selectedItems = ZoteroPane.getSelectedItems();

            /***********************************
             * visibility of zotlink item menu *
             ***********************************/
            document.getElementById("zotlink-itemmenu").hidden = false;
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

            /*****************
             * unlink option *
             *****************/
            // remove this option if multiple items are selected or the selected item is an attachment/note
            if (selectedItems.length > 1 ||
                selectedItems[0].isAttachment() ||
                selectedItems[0].isNote()) {
                document.getElementById("zotlink-manage-links").hidden = true;
            }
            else {
                document.getElementById("zotlink-manage-links").hidden = false;
                // gray out this option if the selected item is not linked to any other item
                document.getElementById("zotlink-manage-links").setAttribute(
                    "disabled",
                    !Zotero.ZotLink.links.findLinks(selectedItems[0].id).length ? true : false
                );
            }

            /******************************
             * link existing items option *
             ******************************/
            // remove this option if multiple items are selected
            if (selectedItems.length > 1) {
                document.getElementById("zotlink-link-existing").parentNode.hidden = true;
            }
            else {
                document.getElementById("zotlink-link-existing").parentNode.hidden = false;
            }
        });
    },

    observer: {
        notify: function(event, type, ids, extra) {

            // general local variables
            var i;
            var sql, params;

            // TODO: currently only interested in item change
            if (type !== "item") return;

            // keep a reference to our ZotLink object
            var zotlink = Zotero.ZotLink;

            // item deletion
            if (event === "delete") {
                // update db
                // TODO: error checking (rollbackTransaction)
                zotlink.DB.beginTransaction();
                sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE item1id IN (" + ids + ") OR item2id IN (" + ids + "));";
                zotlink.DB.query(sql);
                sql = "DELETE FROM links WHERE item1id IN (" + ids + ") OR item2id IN (" + ids + ");";
                zotlink.DB.query(sql);
                zotlink.DB.commitTransaction();
                // also update the cache to reduce database access
                for (i = 0; i < ids.length; i++) {
                    // log event msg
                    zotlink.log(type + " " + ids[i] + " deleted!");
                    zotlink.links.removeLinks(ids[i]);
                }
            }
            // item modification
            else if (event === "modify") {
                // loop over changed items
                for (i = 0; i < ids.length; i++) {
                    // get the changed item
                    var id = ids[i];
                    var source = Zotero.Items.get(id);

                    // log event msg
                    zotlink.log(type + " " + id + " modified!");

                    // update all items that are linked to this item (directly and indirectly)
                    zotlink.syncLinks(source);
                }
            }
        },
    },

    promptCreateLink: function() {
        // get selected items
        var selectedItems = ZoteroPane.getSelectedItems();
        // get destination library id and collection id
        var io = {};
        window.openDialog("chrome://zotlink/content/pickLinkDestination.xul",
                          "",
                          "chrome,centerscreen,modal,resizable",
                          io);
        var result = io.out;
        // do nothing if user hit cancel
        if (!result || !result.accepted) {
            return;
        }
        // do the actual job
        for (var i = 0; i < selectedItems.length; i++) {
            this.createLink(selectedItems[i], result.destLibraryID, result.destCollectionID);
        }
    },

    createLink: function(source, destLibraryID, destCollectionID) {
        // 1. pick fields to sync
        var linkFields = this.pickLinkFields(source);
        if (!linkFields || !linkFields.selectedFields || !linkFields.selectedFields.length) return;

        // 2. create new item at the target location
        var newItem = new Zotero.Item(source.itemTypeID);
        // add the item to the target library
        newItem.libraryID = destLibraryID || null;
        var newItemID = newItem.save();
        newItem = Zotero.Items.get(newItemID);
        // add the item to the target collection
        if (destCollectionID) {
            Zotero.Collections.get(destCollectionID).addItem(newItemID);
        }

        // 3. initialize the link and sync link fields for the first time
        this.initLink(source, newItem, linkFields);
        this.syncLinkFields(source, newItem, linkFields.selectedFields);
    },

    promptLinkExisting: function() {
        // source item to link to (only one item can be selected)
        var source = ZoteroPane.getSelectedItems()[0];

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
                                        "The selected target items will be overwritten by the source item.\n" +
                                        "Make sure you already have important information backed-up!");
        if (!confirmed) {
            return;
        }

        // do the actual job
        for (var i = 0; i < targets.length; i++) {
            this.linkExisting(source, Zotero.Items.get(targets[i]));
        }
    },

    linkExisting: function(source, target) {
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

        // 2. pick fields to sync
        var linkFields = this.pickLinkFields(source);
        if (!linkFields || !linkFields.selectedFields || !linkFields.selectedFields.length) return;

        // 3. initialize the link and sync link fields for the first time
        this.initLink(source, target, linkFields);
        this.syncLinkFields(source, target, linkFields.selectedFields);
    },

    pickLinkFields: function(source) {
        var io = {item: source};
        window.openDialog("chrome://zotlink/content/pickLinkFields.xul",
                          "",
                          "chrome,centerscreen,modal,resizable",
                          io);
        return io.out;
    },

    syncLinks: function(source, visited) {
        if (!visited) visited = [];

        // source item has been visited by now
        visited.push(source.id);
        this.log("just finished visiting " + source.id);
        this.log("visited: " + visited);

        var targets = this.links.findLinks(source.id);
        for (var i = 0; i < targets.length; i++) {
            // target has already been visited
            if (visited.indexOf(targets[i]) > -1) continue;

            var target = Zotero.Items.get(targets[i]);

            // the target item does not exist, purge database and cache
            if (!target) {
                this.DB.beginTransaction();
                var sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE item1id=? OR item2id=?);";
                var params = [targets[i], targets[i]];
                this.DB.query(sql, params);
                sql = "DELETE FROM links WHERE item1id=? OR item2id=?;";
                this.DB.query(sql, params);
                this.DB.commitTransaction();
                this.links.removeLinks(targets[i]);
            }

            // TODO: since now we can't know which fields were modified, we have to do an entire sync
            // update the target
            this.syncLinkFields(source, target);
        }

        // recursion
        // why here? (why not in the above loop)
        //   because we want it to be done in a BFS way (instead of DFS)
        for (var i = 0; i < targets.length; i++) {
            // target has already been visited
            if (visited.indexOf(targets[i]) > -1) continue;

            this.syncLinks(Zotero.Items.get(targets[i]), visited);
        }
    },

    syncLinkFields: function(source, target, fields) {
        // temporarily stop listening to events
        Zotero.Notifier.unregisterObserver(this.observerID);

        // fields not provided, need to retrieve from database
        if (!fields) {
            var sql = "SELECT fieldids FROM linkFields WHERE linkid=(SELECT id FROM links WHERE (item1id=? AND item2id=?) OR (item1id=? AND item2id=?));";
            var params = [source.id, target.id, target.id, source.id];
            fields = this.DB.valueQuery(sql, params);
            // no link fields info in db - attachment/note; simply do a clone
            if (!fields) {
                this.log("syncing attachment/note: cloning...");
                source.clone(false, target);
                target.save();
                // resume listening to events and early return
                this.observerID = Zotero.Notifier.registerObserver(this.observer, this.typesToObserve);
                return;
            }
            // to array
            fields = fields.replace(" ", "").split(",");
        }

        // regular item

        // sync each field
        for (var i = 0; i < fields.length; i++) {
            var fieldid = parseInt(fields[i]);
            // regular field
            if (fieldid > 0) {
                target.setField(fieldid, source.getField(fieldid));
            }
            // additional field
            else {
                switch (fieldid) {
                    // Creators
                    case -1:
                        this.log("syncing creators...");
                        // remove all old creators
                        for (var j = target.numCreators() - 1; j >= 0; j--) {
                            if (target.getCreator(j)) {
                                target.removeCreator(j);
                            }
                        }
                        var creators = source.getCreators();
                        // add creators to the target (create if necessary)
                        for (var j = 0; j < creators.length; j++) {
                            // same library
                            if (source.libraryID === target.libraryID) {
                                target.setCreator(j, creators[j].ref, creators[j].creatorTypeID);
                            }
                            // different library
                            else {
                                var creator;
                                var creatorTypeID = creators[j].creatorTypeID;
                                // creator already exist
                                var creatorids = Zotero.Creators.getCreatorsWithData(Zotero.Creators.getDataID(creators[j].ref), target.libraryID);
                                if (creatorids) {
                                    creator = Zotero.Creators.get(creatorids[0]);
                                }
                                // need to create creators
                                else {
                                    creator = new Zotero.Creator;
                                    creator.libraryID = target.libraryID;
                                    creator.setFields(creators[j].ref);
                                    creator.save();
                                }
                                target.setCreator(j, creator, creatorTypeID);
                            }
                        }
                        break;
                    // Tags
                    case -2:
                        target.removeAllTags();
                        var tags = source.getTags();
                        for (var j = 0; j < tags.length; j++) {
                            target.addTag(tags[j].name);
                        }
                        break;
                }
            }
        }
        target.save();

        // resume listening to events
        this.observerID = Zotero.Notifier.registerObserver(this.observer, this.typesToObserve);
    },

    initLink: function(source, target, linkFields) {
        // temporarily stop listening to events
        Zotero.Notifier.unregisterObserver(this.observerID);

        // 1. basic fields
        // i. update database
        var sql, params;

        this.DB.beginTransaction();

        try {
            // insert link relationship
            sql = "INSERT INTO links (item1id, item2id) VALUES (?, ?);";
            params = [source.id, target.id];
            var linkid =  this.DB.query(sql, params);

            // insert link fields
            sql = "INSERT INTO linkFields VALUES (?, ?);";
            params = [linkid, linkFields.selectedFields.toString()];
            this.DB.query(sql, params);

            this.DB.commitTransaction();
        }
        catch (e) {
            // TODO: take care of other things (e.g. delete the newly created item)
            // this should never happen though
            this.DB.rollbackTransaction();
            this.ps.alert(null,
                          "Link Failed",
                          "Unexpected error occurred. Please try again.");
            return false;
        }

        // ii. update cache
        this.links.addLink([source.id, target.id]);

        // 2. attachments
        var attachments = Zotero.Items.get(linkFields.selectedAttachments);
        for (var i = 0; i < attachments.length; i++) {
            var attachment = new Zotero.Item("attachment");
            attachment.libraryID = target.libraryID;
            attachments[i].clone(false, attachment, true);
            attachment.setSource(target.id);
            var attachmentID = attachment.save();
            attachment = Zotero.Items.get(attachmentID);
            attachments[i].clone(false, attachment);

            // link these two attachment
            sql = "INSERT INTO links (item1id, item2id) VALUES (?, ?);";
            params = [attachments[i].id, attachmentID];
            this.DB.query(sql, params);
            // also update the cache
            this.links.addLink([attachments[i].id, attachmentID]);
        }

        // 3. notes
        var notes = Zotero.Items.get(linkFields.selectedNotes);
        for (var i = 0; i < notes.length; i++) {
            var note = new Zotero.Item("note");
            note.libraryID = target.libraryID;
            notes[i].clone(false, note, true);
            note.setSource(target.id);
            var noteID = note.save();
            note = Zotero.Items.get(noteID);
            notes[i].clone(false, note);

            // link these two note
            sql = "INSERT INTO links (item1id, item2id) VALUES (?, ?);";
            params = [notes[i].id, noteID];
            this.DB.query(sql, params);
            // also update the cache
            this.links.addLink([notes[i].id, noteID]);
        }

        // resume listening to events
        this.observerID = Zotero.Notifier.registerObserver(this.observer, this.typesToObserve);

        return true;
    },

    promptManageLinks: function() {
        var source = ZoteroPane.getSelectedItems()[0];
        var io = {item: source};
        window.openDialog("chrome://zotlink/content/manageLinks.xul",
                          "",
                          "chrome,centerscreen,resizable",
                          io);
    },

    deleteLink: function(item1id, item2id) {
        // update database
        this.DB.beginTransaction();
        var sql = "DELETE FROM linkFields WHERE linkid=(SELECT id FROM links WHERE (item1id=? AND item2id=?) OR (item1id=? AND item2id=?));";
        var params = [item1id, item2id, item2id, item1id];
        this.DB.query(sql, params);
        sql = "DELETE FROM links WHERE (item1id=? AND item2id=?) OR (item1id=? AND item2id=?);";
        this.DB.query(sql, params);
        this.DB.commitTransaction();
        // update cache
        this.links.removeLink(item1id, item2id);

        // also unlink their attachments and notes
        var item1 = Zotero.Items.get(item1id),
            item2 = Zotero.Items.get(item2id);
        if (item1.isAttachment() || item1.isNote() || item2.isAttachment() || item2.isNote()) return;
        // attachments
        var item1attachments = item1.getAttachments(),
            item2attachments = item2.getAttachments();
        for (var i = 0; i < item1attachments.length; i++) {
            for (var j = 0; j < item2attachments.length; j++) {
                this.deleteLink(item1attachments[i], item2attachments[j]);
            }
        }
        // notes
        var item1notes = item1.getNotes(),
            item2notes = item2.getNotes();
        for (var i = 0; i < item1notes.length; i++) {
            for (var j = 0; j < item2notes.length; j++) {
                this.deleteLink(item1notes[i], item2notes[j]);
            }
        }
    },
};


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
            this.graph[item1id] = [parseInt(item2id)];
        }
        else {
            this.graph[item1id].push(parseInt(item2id));
        }
        if (!this.graph.hasOwnProperty(item2id)) {
            this.graph[item2id] = [parseInt(item1id)];
        }
        else {
            this.graph[item2id].push(parseInt(item1id));
        }
    };

    // // find id of all linked items to the given item using BFS
    // this.findLinks = function(itemid) {
    //     var tovisit = [itemid],
    //         visted  = [];

    //     while (tovisit.length) {
    //         var current = tovisit.shift();
    //         visted.push(current);

    //         if (!this.graph[current]) {
    //             continue;
    //         }

    //         for (var i = 0; i < this.graph[current].length; i++) {
    //             var candidate = this.graph[current][i];
    //             if (tovisit.indexOf(candidate) === -1 &&
    //                 visted.indexOf(candidate)  === -1) {
    //                 tovisit.push(candidate);
    //             }
    //         }
    //     }

    //     // the first item in the visited list is the given item itself
    //     visted.shift();
    //     return visted;
    // };

    this.findLinks = function(itemid) {
        return this.graph[itemid] || [];
    };

    this.removeLink = function(item1id, item2id) {
        if (this.graph[item1id] && this.graph[item1id].indexOf(item2id) > -1) {
            this.graph[item1id].splice(this.graph[item1id].indexOf(item2id), 1);
            if (!this.graph[item1id].length) delete this.graph[item1id];
        }
        if (this.graph[item2id] && this.graph[item2id].indexOf(item1id) > -1) {
            this.graph[item2id].splice(this.graph[item2id].indexOf(item1id), 1);
            if (!this.graph[item2id].length) delete this.graph[item2id];
        }
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
