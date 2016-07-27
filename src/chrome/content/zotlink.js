Zotero.ZotLink = {

    /************
     * observer *
     ************/
    // types to observe
    _typesToObserve: ["item", "tag", "collection", "collection-item"],
    // current observer id
    _observerID: null,
    // observer lock
    _observerLock: 1,
    // lock (unregister) the observer before any action that may fire up an event
    //   that is not user initiated
    lockobsvr: function() {
        if (this._observerLock) {
            this._observerLock--;
            Zotero.Notifier.unregisterObserver(this._observerID);
            return true;
        }
        return false;
    },
    // unlock (register back) the observer after the above action is completed
    unlockobsvr: function(cert) {
        if (cert === true) {
            this._observerID = Zotero.Notifier.registerObserver(this.observer, this._typesToObserve);
            this._observerLock++;
            return true;
        }
        if (cert === false) return true;
        log("valid certificate must be given to unlock observer!");
        return false;
    },
    // events object
    _events: null,

    // observer object (required by API)
    observer: {
        notify: function(event, type, ids, extra) {
            var handler = Zotero.ZotLink._events;
            switch (type) {
                case "item":
                    switch (event) {
                        case "delete":
                            handler.onItemDeletion(ids);
                            break;
                        case "modify":
                            handler.onItemModification(ids);
                            break;
                    }
                    break;
                case "tag":
                    switch (event) {
                        case "modify":
                            handler.onTagModification(ids);
                            break;
                    }
                    break;
                case "collection":
                    switch (event) {
                        case "modify":
                            handler.onCollectionModification(ids);
                            break;
                    }
                    break;
            }
        },
    },
    /********************************************/

    init: function() {
        // establish db connection and initialize db
        _load("chrome://zotlink/content/dbManager.js");
        this.DBManager.initDB();

        // start listening to events
        this._observerID = Zotero.Notifier.registerObserver(this.observer, this._typesToObserve);
        // stop listening to events when unloaded
        window.addEventListener("unload", function() {
            Zotero.Notifier.unregisterObserver(this._observerID);
        });
        // initialize events object
        this._events = new _Events(this);
    },

    // context menu option callbacks
    /********************************************/

    promptCreateLinkedItem: function() {
        // get selected items
        var selectedItems = ZoteroPane.getSelectedItems();
        // get destination library id and collection id
        var io = {linkType: "item"};
        dialog("pickDestination", "chrome,centerscreen,modal,resizable", io);
        var result = io.out;
        // do nothing if user hit cancel
        if (!result || !result.accepted) {
            return;
        }
        // do the actual job
        for (var i = 0; i < selectedItems.length; i++) {
            this.createLinkedItem(selectedItems[i], result.destLibraryID, result.destCollectionID);
        }
    },

    promptCreateLinkedCollection: function() {
        // get selected collection
        var selectedCollection = ZoteroPane.getSelectedCollection();
        // get destination library id and collection id
        var io = {linkType: "collection", source: selectedCollection};
        dialog("pickDestination", "chrome,centerscreen,modal,resizable", io);
        var result = io.out;
        // do nothing if user hit cancel
        if (!result || !result.accepted) {
            return;
        }
        // do the actual job
        this.createLinkedCollection(selectedCollection, result.destLibraryID, result.destCollectionID);
    },

    // core functions
    /********************************************/

    createLinkedItem: function(source, destLibraryID, destCollectionID, linkFields) {
        // 1. pick fields to sync if necessary
        if (!linkFields) linkFields = this._pickItemLinkFields(source);
        if (!linkFields ||
            !linkFields.selectedBasicFields ||
            !linkFields.selectedAttachments ||
            !linkFields.selectedNotes) return false;

        var cert = this.lockobsvr();
        var delayedEventIDs = [];

        // 2. create new item at the target location
        var newItem = new Zotero.Item(source.itemTypeID);
        // add the item to the target library
        newItem.libraryID = destLibraryID || null;
        var newItemID = newItem.save();
        newItem = Zotero.Items.get(newItemID);
        // add the item to the target collection
        if (destCollectionID) {
            Zotero.Collections.get(destCollectionID).addItem(newItemID);
            // EVENT
            delayedEventIDs.push(this._events.enqueueDelayedEvent(this._events.onCollectionItemAddition, destCollectionID + "-" + newItemID));
        }

        // 3. initialize the link and sync the two linked items for the first time
        if (this.initItemLink(source, newItem, linkFields) &&
            this.syncItemLink(source, newItem, linkFields.selectedBasicFields)) {
            this._events.executeDelayedEvents(delayedEventIDs);
            this.unlockobsvr(cert);
            return true;
        }
        this._events.executeDelayedEvents(delayedEventIDs);
        this.unlockobsvr(cert);
        return false;
    },

    initItemLink: function(source, target, linkFields) {
        if (!linkFields ||
            !linkFields.selectedBasicFields ||
            !linkFields.selectedAttachments ||
            !linkFields.selectedNotes) return false;

        var cert = this.lockobsvr();
        var delayedEventIDs = [];

        var sql, params;

        // 1. basic fields
        if (!this.DBManager.addItemLink(source.id, target.id, linkFields.selectedBasicFields)) {
            alert("Link Failed", "Unexpected error occurred. Please try again.");
            this._events.executeDelayedEvents(delayedEventIDs);
            this.unlockobsvr(cert);
            return false;
        }

        // 2. attachments
        var attachments = Zotero.Items.get(linkFields.selectedAttachments);
        for (var i = 0; i < attachments.length; i++) {
            var attachment = new Zotero.Item("attachment");
            attachment.libraryID = target.libraryID;
            attachment.setSource(target.id);
            attachment.attachmentLinkMode = attachments[i].attachmentLinkMode;
            attachment.attachmentMIMEType = attachments[i].attachmentMIMEType;
            attachment.attachmentCharset = attachments[i].attachmentCharset;
            var attachmentID = attachment.save();
            attachment = Zotero.Items.get(attachmentID);
            this.syncItemLink(attachments[i], attachment);
            // link these two attachment
            this.DBManager.addItemLink(attachments[i].id, attachmentID);
        }

        // 3. notes
        var notes = Zotero.Items.get(linkFields.selectedNotes);
        for (var i = 0; i < notes.length; i++) {
            var note = new Zotero.Item("note");
            note.libraryID = target.libraryID;
            note.setSource(target.id);
            var noteID = note.save();
            note = Zotero.Items.get(noteID);
            this.syncItemLink(notes[i], note);
            // link these two note
            this.DBManager.addItemLink(notes[i].id, noteID);
        }

        this._events.executeDelayedEvents(delayedEventIDs);
        this.unlockobsvr(cert);
        return true;
    },

    syncItemLink: function(source, target, fields) {
        var cert = this.lockobsvr();
        var delayedEventIDs = [];

        // fields not provided, need to retrieve from database
        if (!fields) {
            fields = this.DBManager.getItemLinkFields(source.id, target.id);
            if (fields === false) {
                // no link fields info in db - sync all fields
                fields = source.getUsedFields();
                // HARD_CODED:
                //   additional fields - must keep in consistence with hardcode.js
                fields.push(-2);
                if (source.isRegularItem()) {
                    fields.push(-1);
                }
                else {
                    fields.push(-3);
                }
            }
            else if (fields === "") {
                fields = [];
            }
            else {
                fields = fields.replace(" ", "").split(",");
            }
        }

        // sync each field
        for (var i = 0; i < fields.length; i++) {
            var fieldid = parseInt(fields[i]);
            // regular field
            if (fieldid > 0) {
                target.setField(fieldid, source.getField(fieldid));
            }
            // HARD_CODED:
            //   additional field
            else {
                switch (fieldid) {
                    // Creators
                    case -1:
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
                    // Notes
                    case -3:
                        target.setNote(source.getNote());
                        break;
                }
            }
        }
        target.save();

        this._events.executeDelayedEvents(delayedEventIDs);
        this.unlockobsvr(cert);
        return true;
    },

    syncItemLinks: function(source, visited) {
        if (!visited) visited = [];

        // source item has been visited by now
        visited.push(source.id);

        var targets = this.DBManager.getItemLinks(source.id);
        for (var i = 0; i < targets.length; i++) {
            // target has already been visited
            if (visited.indexOf(targets[i]) > -1) continue;

            var target = Zotero.Items.get(targets[i]);

            // the target item does not exist, purge database and cache
            if (!target) {
                this.DBManager.deleteItemLinks(targets[i]);
            }

            // TODO: since now we can't know which fields were modified, we have to do an entire sync
            //   update the target
            this.syncItemLink(source, target);
        }

        // recursion
        // why here? (why not in the above loop)
        //   because we want it to be done in a BFS way (instead of DFS)
        for (var i = 0; i < targets.length; i++) {
            // target has already been visited
            if (visited.indexOf(targets[i]) > -1) continue;

            this.syncItemLinks(Zotero.Items.get(targets[i]), visited);
        }
    },

    createLinkedCollection: function(source, destLibraryID, destCollectionID, fieldids) {
        // 1. pick info to be synced if necessary
        if (!fieldids) {
            var _out = this._pickCollectionLinkFields();
            if (!_out || !_out.fieldids) return false;
            fieldids = _out.fieldids;
        }

        var cert = this.lockobsvr();
        var delayedEventIDs = [];

        // 2. create new collection at the target location
        var newCollection = new Zotero.Collection;
        newCollection.libraryID = destLibraryID || null;
        newCollection.name = source.name;
        if (destCollectionID) newCollection.parent = destCollectionID;
        var newCollectionID = newCollection.save();
        // EVENT
        delayedEventIDs.push(this._events.enqueueDelayedEvent(this._events.onCollectionAddition, newCollectionID));
        newCollection = Zotero.Collections.get(newCollectionID);

        // 3. initialize the link
        // TODO: do not need to sync for the first time
        //   because the only basic field collection has is the name
        //   which is copied over during initialization no matter what
        if (this.initCollectionLink(source, newCollection, fieldids)) {
            this._events.executeDelayedEvents(delayedEventIDs);
            this.unlockobsvr(cert);
            return true;
        }
        this._events.executeDelayedEvents(delayedEventIDs);
        this.unlockobsvr(cert);
        return false;
    },

    initCollectionLink: function(source, target, linkFieldIDs) {

        // HARD_CODED:
        //   the field ids used in this function are all hard-coded
        //   must keep in consistence with hardcode.js

        function _createItemLinkFields(sourceItem, collectionLinkFieldIDs) {
            var i;

            var linkFields = {
                selectedBasicFields: [],
                selectedAttachments: [],
                selectedNotes: [],
            };
            // 1. Item Info
            if (collectionLinkFieldIDs.indexOf(3) > -1) {
                // basic fields
                var fields = sourceItem.serialize().fields;
                for (var field in fields) {
                    var fieldID = Zotero.ItemFields.getID(field);
                    if (fieldID && Zotero.ItemFields.isValidForType(fieldID, sourceItem.itemTypeID)) {
                        linkFields.selectedBasicFields.push(fieldID);
                    }
                }
                // additional fields
                if (sourceItem.isRegularItem()) linkFields.selectedBasicFields.push(-1);
                else linkFields.selectedBasicFields.push(-3);
            }
            // 2. Item Tags
            if (collectionLinkFieldIDs.indexOf(4) > -1) {
                linkFields.selectedBasicFields.push(-2);
            }
            // 3. Item Attachments
            if (collectionLinkFieldIDs.indexOf(5) > -1) {
                var attachments = sourceItem.getAttachments();
                for (i = 0; i < attachments.length; i++) {
                    var attachment = attachments[i];
                    if (attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL) {
                        linkFields.selectedAttachments.push(attachment.id);
                    }
                }
            }
            // 4. Item Notes
            if (collectionLinkFieldIDs.indexOf(6) > -1) {
                var notes = sourceItem.getNotes();
                for (i = 0; i < notes.length; i++) {
                    linkFields.selectedNotes.push(notes[i].id);
                }
            }

            return linkFields;
        }

        if (!linkFieldIDs) return;

        var cert = this.lockobsvr();
        var delayedEventIDs = [];

        // 1. insert link
        if (!this.DBManager.addCollectionLink(source.id, target.id, linkFieldIDs)) {
            alert("Link Failed", "Unexpected error occurred. Please try again.");
            this._events.executeDelayedEvents(delayedEventIDs);
            this.unlockobsvr(cert);
            return false;
        }

        // 2. handle each link field
        for (var i = 0; i < linkFieldIDs.length; i++) {
            switch (linkFieldIDs[i]) {
                case 1:         // collection name
                    // the new collection initially has the same name as the source
                    //   so nothing needs to be done here
                    break;
                case 2:         // items
                    // link all the items
                    var items = source.getChildItems();
                    for (var j = 0; j < items.length; j++) {
                        var item = items[j];
                        // skip item attachments/notes
                        //   since they will be taken care of by their sources
                        if (item.getSource()) continue;
                        this.createLinkedItem(item, target.libraryID, target.id, _createItemLinkFields(item, linkFieldIDs));
                    }
                    break;
                case 3:
                case 4:
                case 5:
                case 6:
                    // these were handled when handling 2
                    break;
                case 7:
                    // link all the sub-collections
                    var subs = source.getChildCollections();
                    for (var j = 0; j < subs.length; j++) {
                        // sub-collections inherit link fields from parent
                        this.createLinkedCollection(subs[j], target.libraryID, target.id, linkFieldIDs);
                    }
                    break;
            }
        }

        this._events.executeDelayedEvents(delayedEventIDs);
        this.unlockobsvr(cert);
        return true;
    },

    // helper functions
    /********************************************/

    _pickItemLinkFields: function(source) {
        var io = {item: source};
        dialog("pickItemLinkFields", "chrome,centerscreen,modal,resizable", io);
        return io.out;
    },

    _pickCollectionLinkFields: function() {
        var io = {};
        dialog("pickCollectionLinkFields", "chrome,centerscreen,modal,resizable=no", io);
        return io.out;
    },

};

/************************************************/

/* event handlers
 */
function _Events(zotlink) {
    this.zotlink = zotlink;

    this._delayedEvents = {};
    this._delayedEventsNextID = 1;
    // this function does take arguments!
    //   first argument being the event-handling function and rest being the arguments to this function
    this.enqueueDelayedEvent = function() {
        var handler = arguments[0];
        var params = Array.from(arguments).slice(1);
        this._delayedEvents[this._delayedEventsNextID] = {handler: handler, params: params, id: this._delayedEventsNextID};
        return this._delayedEventsNextID++;
    };
    this.executeDelayedEvent = function(id) {
        var event = this._delayedEvents[id];
        if (!event) return;
        event.handler.apply(this, event.params);
    };
    this.executeDelayedEvents = function(ids) {
        for (var i = 0; i < ids.length; i++) this.executeDelayedEvent(ids[i]);
    };

    this.onItemDeletion = function(ids) {
        this.zotlink.DBManager.deleteItemsLinks(ids);
        for (var i = 0; i < ids.length; i++) {
            log("item " + ids[i] + " deleted!");
        }
    };

    this.onItemModification = function(ids) {
        // loop over changed items
        for (var i = 0; i < ids.length; i++) {
            // get the changed item
            var id = ids[i];
            var source = Zotero.Items.get(id);

            log("item " + id + " modified!");

            // update all items that are linked to this item (directly and indirectly)
            this.zotlink.syncItemLinks(source);
        }
    };

    this.onTagModification = function(ids) {
        for (var i = 0; i < ids.length; i++) {
            var items = Zotero.Tags.getTagItems(ids[i]);
            this.onItemModification(items);
        }
    };

    this.onCollectionItemAddition = function() {

    };
    this.onCollectionModification = function() {

    };
    this.onCollectionAddition = function() {

    };
}
