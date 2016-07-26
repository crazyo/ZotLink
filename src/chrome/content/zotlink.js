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

        // // start listening to events
        // this._observerID = Zotero.Notifier.registerObserver(this.observer, this._typesToObserve);
        // // stop listening to events when unloaded
        // window.addEventListener("unload", function() {
        //     Zotero.Notifier.unregisterObserver(this._observerID);
        // });
        // // initialize events object
        // this._events = new _Events(this);
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
            delayedEventIDs.push(this._events.enqueueDelayedEvent(this._events.onCollectionItemAddition, destCollectionID + "-" + newItemID));
        }

        // 3. initialize the link and sync the two linked items for the first time
        if (this.initItemLink(source, newItem, linkFields) &&
            this.syncLinkedItems(source, newItem, linkFields.selectedBasicFields)) {
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
        // i. update database
        if (!this.dbManager.addItemLink(source.id, target.id, linkFields.selectedBasicFields)) {
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
            this.syncLinkedItems(attachments[i], attachment);

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
            note.setSource(target.id);
            var noteID = note.save();
            note = Zotero.Items.get(noteID);
            this.syncLinkedItems(notes[i], note);

            // link these two note
            sql = "INSERT INTO links (item1id, item2id) VALUES (?, ?);";
            params = [notes[i].id, noteID];
            this.DB.query(sql, params);
            // also update the cache
            this.links.addLink([notes[i].id, noteID]);
        }

        this._events.executeDelayedEvents(delayedEventIDs);
        this.unlockobsvr(cert);
        return true;
    },

    syncLinkedItems: function(source, target, fields) {
        var cert = this.lockobsvr();
        var delayedEventIDs = [];

        // fields not provided, need to retrieve from database
        if (!fields) {
            var sql = "SELECT fieldids FROM linkFields WHERE linkid=(SELECT id FROM links WHERE (item1id=? AND item2id=?) OR (item1id=? AND item2id=?));";
            var params = [source.id, target.id, target.id, source.id];
            fields = this.DB.valueQuery(sql, params);
            if (fields === false) {
                // no link fields info in db - sync all fields
                fields = source.getUsedFields();
                // additional fields
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
            // additional field
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



    // helper functions
    /********************************************/

    _pickItemLinkFields: function(source) {
        var io = {item: source};
        dialog("pickItemLinkFields", "chrome,centerscreen,modal,resizable", io);
        return io.out;
    },

};
