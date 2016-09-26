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
            log("==========");
            log("event occurred: " + type + " " + event + "; ids: " + ids);
            log("==========");
            var handler = Zotero.ZotLink._events;
            var eventObj = {event: event, type: type, ids: ids};
            switch (type) {
                case "item":
                    switch (event) {
                        case "delete":
                            handler.onItemDeletion(eventObj);
                            break;
                        case "modify":
                            handler.onItemModification(eventObj);
                            break;
                    }
                    break;
                case "tag":
                    switch (event) {
                        case "modify":
                            handler.onTagModification(eventObj);
                            break;
                    }
                    break;
                case "collection":
                    switch (event) {
                        case "delete":
                            handler.onCollectionDeletion(eventObj);
                            break;
                        case "modify":
                            handler.onCollectionModification(eventObj);
                            break;
                        case "add":
                            handler.onCollectionAddition(eventObj);
                            break;
                    }
                    break;
                case "collection-item":
                    switch (event) {
                        case "add":
                            handler.onCollectionItemAddition(eventObj);
                            break;
                        case "remove":
                            handler.onCollectionItemRemoval(eventObj);
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
        // get the selected item
        var selectedItem = ZoteroPane.getSelectedItems()[0];
        // get destination library id and collection id
        var io = {linkType: "item", source: selectedItem};
        dialog("pickDestination", "chrome,centerscreen,modal,resizable", io);
        var result = io.out;
        // do nothing if user hit cancel
        if (!result || !result.accepted) {
            return;
        }
        // do the actual job
        this.createLinkedItem(selectedItem, result.destLibraryID, result.destCollectionID);
    },

    promptMergeLinkExistingItems: function() {
        // get the selected item (source item)
        var source = ZoteroPane.getSelectedItems()[0];
        // select a target item
        var io = {singleSelection: true};
        window.openDialog("chrome://zotero/content/selectItemsDialog.xul", "", "chrome,modal", io);
        var targetids = io.dataOut;
        // do nothing if user hit cancel or didn't select any item
        if (!targetids || !targetids.length) {
            return;
        }
        // only one item can be selected
        var target = Zotero.Items.get(targetids[0]);
        // do the actual job
        this.mergeLinkExistingItems(source, target);
    },

    promptManageItemLinks: function() {
        var io = {item: ZoteroPane.getSelectedItems()[0]};
        dialog("manageItemLinks", "chrome,centerscreen,resizable", io);
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

    promptManageCollectionLinks: function() {
        var io = {collection: ZoteroPane.getSelectedCollection()};
        dialog("manageCollectionLinks", "chrome,centerscreen,resizable", io);
    },

    // core functions
    /********************************************/

    createLinkedItem: function(source, destLibraryID, destCollectionID, linkFields, suppressEvent) {
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
            if (!suppressEvent) {
                var eventObj = {event: "add", type: "collection-item", ids: [destCollectionID + "-" + newItemID]};
                delayedEventIDs.push(this._events.enqueueDelayedEvent(this._events.onCollectionItemAddition, eventObj));
            }
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

    mergeLinkExistingItems: function(source, target) {
        if (!this._checkLinkAllowed(source, target)) return false;
        var linkFields = this._pickItemMergeLinkFields(source, target);
        if (!linkFields ||
            !linkFields.selectedBasicFields ||
            !linkFields.selectedAttachments ||
            !linkFields.selectedNotes) return false;

        var i;

        // 1. update basic fields
        var fieldid;
        var sourceFields = [],
            targetFields = [];
        for (fieldid in linkFields.selectedBasicFields) {
            if (!linkFields.selectedBasicFields.hasOwnProperty(fieldid)) continue;

            if (linkFields.selectedBasicFields[fieldid] === source.id) sourceFields.push(fieldid);
            else targetFields.push(fieldid);
        }
        this.syncItemLink(source, target, sourceFields);
        this.syncItemLink(target, source, targetFields);

        // 2. add item link
        this.DBManager.addItemLink(source.id, target.id, sourceFields.concat(targetFields));

        // 3. sync attachments
        var attachmentid, attachments, attachment;
        var sourceAttachments = [],
            targetAttachments = [];
        for (attachmentid in linkFields.selectedAttachments) {
            if (!linkFields.selectedAttachments.hasOwnProperty(attachmentid)) continue;

            if (linkFields.selectedAttachments[attachmentid] === source.id) sourceAttachments.push(attachmentid);
            else targetAttachments.push(attachmentid);
        }
        attachments = Zotero.Items.get(sourceAttachments);
        for (i = 0; i < attachments.length; i++) {
            attachment = new Zotero.Item("attachment");
            attachment.libraryID = target.libraryID;
            attachment.setSource(target.id);
            attachment.attachmentLinkMode = attachments[i].attachmentLinkMode;
            attachment.attachmentMIMEType = attachments[i].attachmentMIMEType;
            attachment.attachmentCharset = attachments[i].attachmentCharset;
            attachmentid = attachment.save();
            attachment = Zotero.Items.get(attachmentid);
            this.syncItemLink(attachments[i], attachment);
            // link these two attachment
            this.DBManager.addItemLink(attachments[i].id, attachmentid);
        }
        attachments = Zotero.Items.get(targetAttachments);
        for (i = 0; i < attachments.length; i++) {
            attachment = new Zotero.Item("attachment");
            attachment.libraryID = source.libraryID;
            attachment.setSource(source.id);
            attachment.attachmentLinkMode = attachments[i].attachmentLinkMode;
            attachment.attachmentMIMEType = attachments[i].attachmentMIMEType;
            attachment.attachmentCharset = attachments[i].attachmentCharset;
            attachmentid = attachment.save();
            attachment = Zotero.Items.get(attachmentid);
            this.syncItemLink(attachments[i], attachment);
            // link these two attachment
            this.DBManager.addItemLink(attachments[i].id, attachmentid);
        }

        // 3. sync notes
        var noteid, notes, note;
        var sourceNotes = [],
            targetNotes = [];
        for (noteid in linkFields.selectedNotes) {
            if (!linkFields.selectedNotes.hasOwnProperty(noteid)) continue;

            if (linkFields.selectedNotes[noteid] === source.id) sourceNotes.push(noteid);
            else targetNotes.push(noteid);
        }
        notes = Zotero.Items.get(sourceNotes);
        for (i = 0; i < notes.length; i++) {
            note = new Zotero.Item("note");
            note.libraryID = target.libraryID;
            note.setSource(target.id);
            noteid = note.save();
            note = Zotero.Items.get(noteid);
            this.syncItemLink(notes[i], note);
            // link these two note
            this.DBManager.addItemLink(notes[i].id, noteid);
        }
        notes = Zotero.Items.get(targetNotes);
        for (i = 0; i < notes.length; i++) {
            note = new Zotero.Item("note");
            note.libraryID = source.libraryID;
            note.setSource(source.id);
            noteid = note.save();
            note = Zotero.Items.get(noteid);
            this.syncItemLink(notes[i], note);
            // link these two note
            this.DBManager.addItemLink(notes[i].id, noteid);
        }
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

        // source has been visited by now
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

    deleteItemLink: function(sourceid, targetid) {
        // unlink the two items
        this.DBManager.deleteItemLink(sourceid, targetid);

        // unlink their attachments and notes
        source = Zotero.Items.get(sourceid);
        target = Zotero.Items.get(targetid);
        if (source.isAttachment() || source.isNote() || target.isAttachment() || target.isNote()) return;
        // attachments
        var sourceAttachments = source.getAttachments(),
            targetAttachments = target.getAttachments();
        for (var i = 0; i < sourceAttachments.length; i++) {
            for (var j = 0; j < targetAttachments.length; j++) {
                this.deleteItemLink(sourceAttachments[i], targetAttachments[j]);
            }
        }
        // notes
        var sourceNotes = source.getNotes(),
            targetNotes = target.getNotes();
        for (var i = 0; i < sourceNotes.length; i++) {
            for (var j = 0; j < targetNotes.length; j++) {
                this.deleteItemLink(sourceNotes[i], targetNotes[j]);
            }
        }
    },

    createLinkedCollection: function(source, destLibraryID, destCollectionID, fieldids, suppressEvent) {
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
        if (!suppressEvent) {
            var eventObj = {event: "add", type: "collection", ids: [newCollectionID]};
            delayedEventIDs.push(this._events.enqueueDelayedEvent(this._events.onCollectionAddition, eventObj));
        }
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
                        this.createLinkedItem(item, target.libraryID, target.id, this._createItemLinkFieldsFromCollectionLinkFields(item, linkFieldIDs), true);
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
                        this.createLinkedCollection(subs[j], target.libraryID, target.id, linkFieldIDs, true);
                    }
                    break;
            }
        }

        this._events.executeDelayedEvents(delayedEventIDs);
        this.unlockobsvr(cert);
        return true;
    },

    removeLinkedItemFromCollection: function(sourceItemID, targetCollectionID) {
        var cert = this.lockobsvr();
        var delayedEventIDs = [];

        // 1. find the linked item
        var _targetItemIDs = this.DBManager.getItemLinks(sourceItemID).filter(function(itemid) {
            return Zotero.Items.get(itemid).inCollection(targetCollectionID);
        });
        if (!_targetItemIDs.length) return;
        // there can only be one linked item in a collection
        var targetItemID = _targetItemIDs[0];

        // 2. remove this item from the target collection
        Zotero.Collections.get(targetCollectionID).removeItem(targetItemID);

        this._events.executeDelayedEvents(delayedEventIDs);
        this.unlockobsvr(cert);
        return true;
    },

    syncCollectionLink: function(source, target, fieldsToSync, eventObj) {

        // HARD_CODED:
        //   the field ids used in this function are all hard-coded
        //   must keep in consistence with hardcode.js

        var i, j;

        // retrieve actual collection link fields
        fields = this.DBManager.getCollectionLinkFields(source.id, target.id);
        if (fields === false || fields === "") return;
        fields = fields.replace(" ", "").split(",");
        // string to int
        for (i = 0; i < fields.length; i++) {
            fields[i] = parseInt(fields[i]);
        }
        // keep the commonality
        for (i = fieldsToSync.length - 1; i >= 0; i--) {
            if (fields.indexOf(fieldsToSync[i]) === -1) {
                fieldsToSync.splice(i, 1);
            }
        }
        if (!fieldsToSync.length) return;

        var cert = this.lockobsvr();
        var delayedEventIDs = [];

        for (i = 0; i < fieldsToSync.length; i++) {
            switch (fieldsToSync[i]) {
                case 1:         // name
                    target.name = source.name;
                    break;
                case 2:         // items
                    switch (eventObj.type) {
                        case "collection-item":
                            switch (eventObj.event) {
                                case "add":
                                    var items = [];
                                    for (j = 0; j < eventObj.ids.length; j++) {
                                        var collectionIDAndItemID = eventObj.ids[j].split("-");
                                        items.push(Zotero.Items.get(parseInt(collectionIDAndItemID[1])));
                                    }
                                    for (j = 0; j < items.length; j++) {
                                        var item = items[j];
                                        this.createLinkedItem(item, target.libraryID, target.id, this._createItemLinkFieldsFromCollectionLinkFields(item, fieldsToSync), true);
                                    }
                                    break;
                                case "remove":
                                    var itemids = [];
                                    for (j = 0; j < eventObj.ids.length; j++) {
                                        var collectionIDAndItemID = eventObj.ids[j].split("-");
                                        itemids.push(collectionIDAndItemID[1]);
                                    }
                                    for (j = 0; j < itemids.length; j++) {
                                        var itemid = itemids[j];
                                        this.removeLinkedItemFromCollection(itemid, target.id);
                                    }
                                    break;
                            }
                            break;
                    }
                    break;
                case 3:
                case 4:
                case 5:
                case 6:
                    // these were handled when handling 2
                    break;
                case 7:         // sub-collections
                    switch (eventObj.type) {
                        case "collection":
                            switch (eventObj.event) {
                                case "add":
                                    var subs = [];
                                    for (j = 0; j < eventObj.ids.length; j++) {
                                        var _sub = Zotero.Collections.get(eventObj.ids[j]);
                                        if (_sub.parent === source.id) subs.push(_sub);
                                    }
                                    for (j = 0; j < subs.length; j++) {
                                        // sub-collections inherit link fields from parent
                                        this.createLinkedCollection(subs[j], target.libraryID, target.id, fields, true);
                                    }
                                    break;
                            }
                            break;
                    }
                    break;
            }
        }
        target.save();

        this._events.executeDelayedEvents(delayedEventIDs);
        this.unlockobsvr(cert);
        return true;
    },

    syncCollectionLinks: function(source, fieldsToSync, eventObj, visited) {
        if (!visited) visited = [];

        // source has been visited by now
        visited.push(source.id);

        var targets = this.DBManager.getCollectionLinks(source.id);
        for (var i = 0; i < targets.length; i++) {
            // target has already been visited
            if (visited.indexOf(targets[i]) > -1) continue;

            var target = Zotero.Collections.get(targets[i]);

            // the target item does not exist, purge database and cache
            if (!target) {
                this.DBManager.deleteCollectionLinks(targets[i]);
            }

            this.syncCollectionLink(source, target, fieldsToSync, eventObj);
        }

        // recursion
        // why here? (why not in the above loop)
        //   because we want it to be done in a BFS way (instead of DFS)
        for (var i = 0; i < targets.length; i++) {
            // target has already been visited
            if (visited.indexOf(targets[i]) > -1) continue;

            this.syncCollectionLinks(Zotero.Collections.get(targets[i]), fieldsToSync, eventObj, visited);
        }
    },

    // helper functions
    /********************************************/

    _pickItemLinkFields: function(source) {
        var io = {item: source};
        dialog("pickItemLinkFields", "chrome,centerscreen,modal,resizable", io);
        return io.out;
    },

    _checkLinkAllowed: function(source, target, quiet) {
        // i> source and target cannot be the same item
        if (source.id === target.id) {
            if (!quiet) {
                alert("Cannot Link Item to Itself",
                      "Source item and target item cannot be the same item!\n" +
                      "source: " + source.id + "; target: " + target.id);
            }
            return false;
        }
        // ii> source and target cannot already be linked
        var existingLinks = this.DBManager.getItemLinks(source.id);
        if (existingLinks && existingLinks.length) {
            for (var i = 0; i < existingLinks.length; i++) {
                if (existingLinks[i] === target.id) {
                    if (!quiet) {
                        alert("Cannot Link Already Linked Items",
                              "Source item and target item are already linked!\n" +
                              "source: " + source.id + "; target: " + target.id);
                    }
                    return false;
                }
            }
        }
        // iii> source and target must be of the same item type
        if (target.itemTypeID !== source.itemTypeID) {
            if (!quiet) {
                alert("Cannot Link Different Types of Items",
                      "Source item and target item must be of the same type!\n" +
                      "source: " + source.id + "; target: " + target.id);
            }
            return false;
        }

        return true;
    },

    _pickItemMergeLinkFields: function(source, target) {
        var io = {source: source, target: target};
        dialog("pickItemMergeLinkFields", "chrome,centerscreen,modal,resizable", io);
        return io.out;
    },

    _pickCollectionLinkFields: function() {
        var io = {};
        dialog("pickCollectionLinkFields", "chrome,centerscreen,modal,resizable=no", io);
        return io.out;
    },

    _createItemLinkFieldsFromCollectionLinkFields: function(sourceItem, collectionLinkFieldIDs) {

        // HARD_CODED:
        //   the field ids used in this function are all hard-coded
        //   must keep in consistence with hardcode.js

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
    },

    // dev/debug functions
    /********************************************/

    _debugItemMenu: function() {
        log("==========");
        log("nothing to do");
        log("==========");
    },

    _debugCollectionMenu: function() {
        log("==========");
        log("getting parent collection id...");
        var selectedCollection = ZoteroPane.getSelectedCollection();
        log(selectedCollection.parent);
        log("==========");
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

    this.onItemDeletion = function(eventObj) {
        var ids = eventObj.ids;
        this.zotlink.DBManager.deleteItemsLinks(ids);
        for (var i = 0; i < ids.length; i++) {
            log("item " + ids[i] + " deleted!");
        }
    };

    this.onItemModification = function(eventObj) {
        var ids = eventObj.ids;
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

    this.onTagModification = function(eventObj) {
        var ids = eventObj.ids;
        for (var i = 0; i < ids.length; i++) {
            var items = Zotero.Tags.getTagItems(ids[i]);
            this.onItemModification({event: "modify", type: "item", ids: items});
        }
    };

    this.onCollectionDeletion = function(eventObj) {
        var ids = eventObj.ids;
        this.zotlink.DBManager.deleteCollectionsLinks(ids);
        for (var i = 0; i < ids.length; i++) {
            log("collection " + ids[i] + " deleted!");
        }
    };

    this.onCollectionModification = function(eventObj) {
        var ids = eventObj.ids;
        // loop over changed collections
        for (var i = 0; i < ids.length; i++) {
            // get the changed collection
            var id = ids[i];
            var source = Zotero.Collections.get(id);

            log("collection " + id + " modified!");

            // right now the only collection modification that interests us is the name
            // HARD_CODED:
            //   must keep in consistence with the field id of collection name in hardcode.js
            var fieldsToSync = [1];
            this.zotlink.syncCollectionLinks(source, fieldsToSync, eventObj);
        }
    };

    this.onCollectionAddition = function(eventObj) {
        var ids = eventObj.ids;

        // classify added collections by their parent collections
        var collectionCollectionAdditions = {};
        for (var i = 0; i < eventObj.ids.length; i++) {
            var id = eventObj.ids[i];
            var _parentid = Zotero.Collections.get(id).parent;
            if (!_parentid) continue;
            if (collectionCollectionAdditions.hasOwnProperty(_parentid)) collectionCollectionAdditions[_parentid].push(id);
            else collectionCollectionAdditions[_parentid] = [id];
        }

        for (var parentid in collectionCollectionAdditions) {
            if (!collectionCollectionAdditions.hasOwnProperty(parentid)) continue;

            log("new sub-collection(s) added to collection " + parentid + "!");

            // HARD_CODED:
            //   must keep in consistence with the field id of collection name in hardcode.js
            var source = Zotero.Collections.get(parseInt(parentid));
            var fieldsToSync = [7];
            var _eventObj = {event: "add", type: "collection", ids: collectionCollectionAdditions[parentid]};
            this.zotlink.syncCollectionLinks(source, fieldsToSync, _eventObj);
        }
    };

    this.onCollectionItemAddition = function(eventObj) {
        var ids = eventObj.ids;

        // classify collection-item additions by the collection
        var collectionItemAdditions = {};
        for (var i = 0; i < ids.length; i++) {
            var _collectionid = ids[i].split("-")[0];
            if (collectionItemAdditions.hasOwnProperty(_collectionid)) collectionItemAdditions[_collectionid].push(ids[i]);
            else collectionItemAdditions[_collectionid] = [ids[i]];
        }

        for (var collectionid in collectionItemAdditions) {
            if (!collectionItemAdditions.hasOwnProperty(collectionid)) continue;

            log("new item(s) added to collection " + collectionid + "!");

            // HARD_CODED:
            //   must keep in consistence with the field id of collection name in hardcode.js
            var source = Zotero.Collections.get(parseInt(collectionid));
            var fieldsToSync = [2, 3, 4, 5, 6];
            var _eventObj = {event: "add", type: "collection-item", ids: collectionItemAdditions[collectionid]};
            this.zotlink.syncCollectionLinks(source, fieldsToSync, _eventObj);
        }
    };

    this.onCollectionItemRemoval = function(eventObj) {
        var ids = eventObj.ids;

        // classify collection-item removals by the collection
        var collectionItemRemovals = {};
        for (var i = 0; i < ids.length; i++) {
            var _collectionid = ids[i].split("-")[0];
            if (collectionItemRemovals.hasOwnProperty(_collectionid)) collectionItemRemovals[_collectionid].push(ids[i]);
            else collectionItemRemovals[_collectionid] = [ids[i]];
        }

        for (var collectionid in collectionItemRemovals) {
            if (!collectionItemRemovals.hasOwnProperty(collectionid)) continue;

            log("item(s) removed from collection " + collectionid + "!");

            // HARD_CODED:
            //   must keep in consistence with the field id of collection name in hardcode.js
            var source = Zotero.Collections.get(parseInt(collectionid));
            var fieldsToSync = [2];
            var _eventObj = {event: "remove", type: "collection-item", ids: collectionItemRemovals[collectionid]};
            this.zotlink.syncCollectionLinks(source, fieldsToSync, _eventObj);
        }
    };
}
