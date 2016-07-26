Zotero.ZotLink = {


    // promptLinkExisting: function() {
    //     // source item to link to (only one item can be selected)
    //     var source = ZoteroPane.getSelectedItems()[0];

    //     // select target items
    //     var io = {};
    //     window.openDialog("chrome://zotero/content/selectItemsDialog.xul", "", "chrome,modal", io);
    //     var targets = io.dataOut;
    //     // do nothing if user hit cancel or didn't select any item
    //     if (!targets || !targets.length) {
    //         return;
    //     }

    //     // confirm
    //     var confirmed = this.ps.confirm(null,
    //                                     "Are You Sure You Want to Continue?",
    //                                     "The selected target items will be overwritten by the source item.\n" +
    //                                     "Make sure you already have important information backed-up!");
    //     if (!confirmed) {
    //         return;
    //     }

    //     // do the actual job
    //     for (var i = 0; i < targets.length; i++) {
    //         this.linkExisting(source, Zotero.Items.get(targets[i]));
    //     }
    // },

    // linkExisting: function(source, target) {
    //     // 1. check if linking is allowed
    //     // i> target and source cannot be the same item
    //     if (source.id === target.id) {
    //         this.ps.alert(null,
    //                       "Cannot Link Item to Itself",
    //                       "Source item and target item cannot be the same item!\n" +
    //                       "source: " + source.id + "; target: " + target.id);
    //         return false;
    //     }
    //     // ii> target and source cannot already be linked
    //     var existingLinks = this.links.findLinks(source.id);
    //     if (existingLinks && existingLinks.length) {
    //         for (var i = 0; i < existingLinks.length; i++) {
    //             if (existingLinks[i] === target.id) {
    //                 this.ps.alert(null,
    //                               "Cannot Link Already Linked Items",
    //                               "Source item and target item are already linked!\n" +
    //                               "source: " + source.id + "; target: " + target.id);
    //                 return false;
    //             }
    //         }
    //     }
    //     // iii> target and source must be of the same item type
    //     if (target.itemTypeID !== source.itemTypeID) {
    //         this.ps.alert(null,
    //                       "Cannot Link Different Types of Items",
    //                       "Source item and target item must be of the same type!\n" +
    //                       "source: " + source.id + "; target: " + target.id);
    //         return false;
    //     }

    //     // 2. pick fields to sync
    //     var linkFields = this.pickLinkFields(source);
    //     if (!linkFields ||
    //         !linkFields.selectedFields ||
    //         !linkFields.selectedAttachments ||
    //         !linkFields.selectedNotes) return false;

    //     // 3. initialize the link and sync link fields for the first time
    //     if (this.initLink(source, target, linkFields) &&
    //         this.syncLinkFields(source, target, linkFields.selectedFields)) {
    //         return true;
    //     }
    //     return false;
    // },

    // pickLinkFields: function(source) {
    //     var io = {item: source};
    //     window.openDialog("chrome://zotlink/content/pickLinkFields.xul",
    //                       "",
    //                       "chrome,centerscreen,modal,resizable",
    //                       io);
    //     return io.out;
    // },

    // syncLinks: function(source, visited) {
    //     if (!visited) visited = [];

    //     // source item has been visited by now
    //     visited.push(source.id);

    //     var targets = this.links.findLinks(source.id);
    //     for (var i = 0; i < targets.length; i++) {
    //         // target has already been visited
    //         if (visited.indexOf(targets[i]) > -1) continue;

    //         var target = Zotero.Items.get(targets[i]);

    //         // the target item does not exist, purge database and cache
    //         if (!target) {
    //             this.DB.beginTransaction();
    //             var sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE item1id=? OR item2id=?);";
    //             var params = [targets[i], targets[i]];
    //             this.DB.query(sql, params);
    //             sql = "DELETE FROM links WHERE item1id=? OR item2id=?;";
    //             this.DB.query(sql, params);
    //             this.DB.commitTransaction();
    //             this.links.removeLinks(targets[i]);
    //         }

    //         // TODO: since now we can't know which fields were modified, we have to do an entire sync
    //         // update the target
    //         this.syncLinkFields(source, target);
    //     }

    //     // recursion
    //     // why here? (why not in the above loop)
    //     //   because we want it to be done in a BFS way (instead of DFS)
    //     for (var i = 0; i < targets.length; i++) {
    //         // target has already been visited
    //         if (visited.indexOf(targets[i]) > -1) continue;

    //         this.syncLinks(Zotero.Items.get(targets[i]), visited);
    //     }
    // },

    // syncLinkFields: function(source, target, fields) {
    //     var cert = this.lockobsvr();
    //     var delayedEventIDs = [];

    //     // fields not provided, need to retrieve from database
    //     if (!fields) {
    //         var sql = "SELECT fieldids FROM linkFields WHERE linkid=(SELECT id FROM links WHERE (item1id=? AND item2id=?) OR (item1id=? AND item2id=?));";
    //         var params = [source.id, target.id, target.id, source.id];
    //         fields = this.DB.valueQuery(sql, params);
    //         if (fields === false) {
    //             // no link fields info in db - sync all fields
    //             fields = source.getUsedFields();
    //             // additional fields
    //             fields.push(-2);
    //             if (source.isRegularItem()) {
    //                 fields.push(-1);
    //             }
    //             else {
    //                 fields.push(-3);
    //             }
    //         }
    //         else if (fields === "") {
    //             fields = [];
    //         }
    //         else {
    //             fields = fields.replace(" ", "").split(",");
    //         }
    //     }

    //     // sync each field
    //     for (var i = 0; i < fields.length; i++) {
    //         var fieldid = parseInt(fields[i]);
    //         // regular field
    //         if (fieldid > 0) {
    //             target.setField(fieldid, source.getField(fieldid));
    //         }
    //         // additional field
    //         else {
    //             switch (fieldid) {
    //                 // Creators
    //                 case -1:
    //                     // remove all old creators
    //                     for (var j = target.numCreators() - 1; j >= 0; j--) {
    //                         if (target.getCreator(j)) {
    //                             target.removeCreator(j);
    //                         }
    //                     }
    //                     var creators = source.getCreators();
    //                     // add creators to the target (create if necessary)
    //                     for (var j = 0; j < creators.length; j++) {
    //                         // same library
    //                         if (source.libraryID === target.libraryID) {
    //                             target.setCreator(j, creators[j].ref, creators[j].creatorTypeID);
    //                         }
    //                         // different library
    //                         else {
    //                             var creator;
    //                             var creatorTypeID = creators[j].creatorTypeID;
    //                             // creator already exist
    //                             var creatorids = Zotero.Creators.getCreatorsWithData(Zotero.Creators.getDataID(creators[j].ref), target.libraryID);
    //                             if (creatorids) {
    //                                 creator = Zotero.Creators.get(creatorids[0]);
    //                             }
    //                             // need to create creators
    //                             else {
    //                                 creator = new Zotero.Creator;
    //                                 creator.libraryID = target.libraryID;
    //                                 creator.setFields(creators[j].ref);
    //                                 creator.save();
    //                             }
    //                             target.setCreator(j, creator, creatorTypeID);
    //                         }
    //                     }
    //                     break;
    //                 // Tags
    //                 case -2:
    //                     target.removeAllTags();
    //                     var tags = source.getTags();
    //                     for (var j = 0; j < tags.length; j++) {
    //                         target.addTag(tags[j].name);
    //                     }
    //                     break;
    //                 // Notes
    //                 case -3:
    //                     target.setNote(source.getNote());
    //                     break;
    //             }
    //         }
    //     }
    //     target.save();

    //     this._events.executeDelayedEvents(delayedEventIDs);
    //     this.unlockobsvr(cert);
    //     return true;
    // },

    // initLink: function(source, target, linkFields) {
    //     if (!linkFields ||
    //         !linkFields.selectedFields ||
    //         !linkFields.selectedAttachments ||
    //         !linkFields.selectedNotes) return false;

    //     var cert = this.lockobsvr();
    //     var delayedEventIDs = [];

    //     // 1. basic fields
    //     // i. update database
    //     var sql, params;

    //     this.DB.beginTransaction();

    //     try {
    //         // insert link relationship
    //         sql = "INSERT INTO links (item1id, item2id) VALUES (?, ?);";
    //         params = [source.id, target.id];
    //         var linkid = this.DB.query(sql, params);

    //         // insert link fields
    //         sql = "INSERT INTO linkFields VALUES (?, ?);";
    //         params = [linkid, linkFields.selectedFields.toString()];
    //         this.DB.query(sql, params);

    //         this.DB.commitTransaction();
    //     }
    //     catch (e) {
    //         // TODO: take care of other things (e.g. delete the newly created item)
    //         // this should never happen though
    //         this.DB.rollbackTransaction();
    //         this.ps.alert(null,
    //                       "Link Failed",
    //                       "Unexpected error occurred. Please try again.");
    //         this._events.executeDelayedEvents(delayedEventIDs);
    //         this.unlockobsvr(cert);
    //         return false;
    //     }

    //     // ii. update cache
    //     this.links.addLink([source.id, target.id]);

    //     // 2. attachments
    //     var attachments = Zotero.Items.get(linkFields.selectedAttachments);
    //     for (var i = 0; i < attachments.length; i++) {
    //         var attachment = new Zotero.Item("attachment");
    //         attachment.libraryID = target.libraryID;
    //         attachment.setSource(target.id);
    //         attachment.attachmentLinkMode = attachments[i].attachmentLinkMode;
    //         attachment.attachmentMIMEType = attachments[i].attachmentMIMEType;
    //         attachment.attachmentCharset = attachments[i].attachmentCharset;
    //         var attachmentID = attachment.save();
    //         attachment = Zotero.Items.get(attachmentID);
    //         this.syncLinkFields(attachments[i], attachment);

    //         // link these two attachment
    //         sql = "INSERT INTO links (item1id, item2id) VALUES (?, ?);";
    //         params = [attachments[i].id, attachmentID];
    //         this.DB.query(sql, params);
    //         // also update the cache
    //         this.links.addLink([attachments[i].id, attachmentID]);
    //     }

    //     // 3. notes
    //     var notes = Zotero.Items.get(linkFields.selectedNotes);
    //     for (var i = 0; i < notes.length; i++) {
    //         var note = new Zotero.Item("note");
    //         note.libraryID = target.libraryID;
    //         note.setSource(target.id);
    //         var noteID = note.save();
    //         note = Zotero.Items.get(noteID);
    //         this.syncLinkFields(notes[i], note);

    //         // link these two note
    //         sql = "INSERT INTO links (item1id, item2id) VALUES (?, ?);";
    //         params = [notes[i].id, noteID];
    //         this.DB.query(sql, params);
    //         // also update the cache
    //         this.links.addLink([notes[i].id, noteID]);
    //     }

    //     this._events.executeDelayedEvents(delayedEventIDs);
    //     this.unlockobsvr(cert);
    //     return true;
    // },

    // promptManageLinks: function() {
    //     var source = ZoteroPane.getSelectedItems()[0];
    //     var io = {item: source};
    //     window.openDialog("chrome://zotlink/content/manageLinks.xul",
    //                       "",
    //                       "chrome,centerscreen,resizable",
    //                       io);
    // },

    // deleteLink: function(item1id, item2id) {
    //     // update database
    //     this.DB.beginTransaction();
    //     var sql = "DELETE FROM linkFields WHERE linkid=(SELECT id FROM links WHERE (item1id=? AND item2id=?) OR (item1id=? AND item2id=?));";
    //     var params = [item1id, item2id, item2id, item1id];
    //     this.DB.query(sql, params);
    //     sql = "DELETE FROM links WHERE (item1id=? AND item2id=?) OR (item1id=? AND item2id=?);";
    //     this.DB.query(sql, params);
    //     this.DB.commitTransaction();
    //     // update cache
    //     this.links.removeLink(item1id, item2id);

    //     // also unlink their attachments and notes
    //     var item1 = Zotero.Items.get(item1id),
    //         item2 = Zotero.Items.get(item2id);
    //     if (item1.isAttachment() || item1.isNote() || item2.isAttachment() || item2.isNote()) return;
    //     // attachments
    //     var item1attachments = item1.getAttachments(),
    //         item2attachments = item2.getAttachments();
    //     for (var i = 0; i < item1attachments.length; i++) {
    //         for (var j = 0; j < item2attachments.length; j++) {
    //             this.deleteLink(item1attachments[i], item2attachments[j]);
    //         }
    //     }
    //     // notes
    //     var item1notes = item1.getNotes(),
    //         item2notes = item2.getNotes();
    //     for (var i = 0; i < item1notes.length; i++) {
    //         for (var j = 0; j < item2notes.length; j++) {
    //             this.deleteLink(item1notes[i], item2notes[j]);
    //         }
    //     }
    // },

//     promptCreateCollectionLink: function() {
//         // get selected collection
//         var selectedCollection = ZoteroPane.getSelectedCollection();
//         // get destination library id and collection id
//         var io = {linkType: "collection", source: selectedCollection};
//         window.openDialog("chrome://zotlink/content/pickLinkDestination.xul",
//                           "",
//                           "chrome,centerscreen,modal,resizable",
//                           io);
//         var result = io.out;
//         // do nothing if user hit cancel
//         if (!result || !result.accepted) {
//             return;
//         }
//         // do the actual job
//         this.createCollectionLink(selectedCollection, result.destLibraryID, result.destCollectionID);
//     },

//     createCollectionLink: function(source, destLibraryID, destCollectionID, fieldids) {
//         // 1. pick info to be synced if necessary
//         if (!fieldids) {
//             var io = {};
//             window.openDialog("chrome://zotlink/content/pickCollectionLinkFields.xul",
//                               "",
//                               "chrome,centerscreen,modal,resizable=no",
//                               io);
//             if (!io.out) return false;
//             fieldids = [];
//             for (var field in io.out) {
//                 if (!io.out.hasOwnProperty(field)) continue;
//                 if (io.out[field]) fieldids.push(this.collectionLinkFields[field].id);
//             }
//         }

//         var cert = this.lockobsvr();
//         var delayedEventIDs = [];

//         // 2. create new collection at the target location
//         var newCollection = new Zotero.Collection;
//         newCollection.libraryID = destLibraryID || null;
//         newCollection.name = source.name;
//         if (destCollectionID) newCollection.parent = destCollectionID;
//         var newCollectionID = newCollection.save();
//         //EVENT
//         delayedEventIDs.push(this._events.enqueueDelayedEvent(this._events.onCollectionAddition, newCollectionID));
//         newCollection = Zotero.Collections.get(newCollectionID);

//         // 3. initialize the link and sync for the first time
//         if (this.initCollectionLink(source, newCollection, fieldids)) {
//             this._events.executeDelayedEvents(delayedEventIDs);
//             this.unlockobsvr(cert);
//             return true;
//         }
//         this._events.executeDelayedEvents(delayedEventIDs);
//         this.unlockobsvr(cert);
//         return false;
//     },

//     syncCollectionLinks: function(source, event, visited) {
//         if (!visited) visited = [];

//         // source collection has been visited by now
//         visited.push(source.id);

//         var targets = this.collectionLinks.findLinks(source.id);
//         for (var i = 0; i < targets.length; i++) {
//             // target has already been visited
//             if (visited.indexOf(targets[i]) > -1) continue;

//             var target = Zotero.Collections.get(targets[i]);

//             // the target collection does not exist, purge database and cache
//             if (!target) {
//                 this.DB.beginTransaction();
//                 var sql = "DELETE FROM collectionLinkFields WHERE linkid IN (SELECT id FROM collectionLinks WHERE collection1id=? OR collection2id=?);";
//                 var params = [targets[i], targets[i]];
//                 this.DB.query(sql, params);
//                 sql = "DELETE FROM collectionLinks WHERE collection1id=? OR collection2id=?;";
//                 this.DB.query(sql, params);
//                 this.DB.commitTransaction();
//                 this.collectionLinks.removeLinks(targets[i]);
//             }

//             this.syncCollectionLinkFields(source, target, event);
//         }

//         // recursion
//         // why here? (why not in the above loop)
//         //   because we want it to be done in a BFS way (instead of DFS)
//         for (var i = 0; i < targets.length; i++) {
//             // target has already been visited
//             if (visited.indexOf(targets[i]) > -1) continue;

//             this.syncCollectionLinks(Zotero.Collections.get(targets[i]), event, visited);
//         }
//     },

//     syncCollectionLinkFields: function(source, target, event, fields) {
//         var cert = this.lockobsvr();
//         var delayedEventIDs = [];

//         // fields not provided, need to retrieve from database
//         if (!fields) {
//             var sql = "SELECT fieldids FROM collectionLinkFields WHERE linkid=(SELECT id FROM collectionLinks WHERE (collection1id=? AND collection2id=?) OR (collection1id=? AND collection2id=?));";
//             var params = [source.id, target.id, target.id, source.id];
//             fields = this.DB.valueQuery(sql, params).replace(" ", "").split(",");
//         }

//         switch (event.type) {
//             case "collection":
//                 switch (event.event) {
//                     case "modify":
//                         // the only modification that interests us is name
//                         if (fields.indexOf(1) === -1) break;
//                         target.name = source.name;
//                         target.save();
//                         break;
//                     case "add":
//                         if (fields.indexOf(7) === -1) break;
//                         for (var i = 0; i < event.ids.length; i++) {
//                             var sub = Zotero.Collections.get(ids[i]);
//                             createCollectionLink(sub, target.libraryID, target.id, fields);
//                         }
//                         break;
//                 }
//                 break;
//         }

//     },

//     initCollectionLink: function(source, target, linkFieldIDs) {

//         function _createItemLinkFields(sourceItem, collectionLinkFieldIDs) {
//             var i;

//             var linkFields = {
//                 selectedFields: [],
//                 selectedAttachments: [],
//                 selectedNotes: [],
//             };
//             // 1. Item Info
//             if (collectionLinkFieldIDs.indexOf(3) > -1) {
//                 // basic fields
//                 var fields = sourceItem.serialize().fields;
//                 for (var field in fields) {
//                     var fieldID = Zotero.ItemFields.getID(field);
//                     if (fieldID && Zotero.ItemFields.isValidForType(fieldID, sourceItem.itemTypeID)) {
//                         linkFields.selectedFields.push(fieldID);
//                     }
//                 }
//                 // additional fields
//                 if (sourceItem.isRegularItem()) linkFields.selectedFields.push(-1);
//                 else linkFields.selectedFields.push(-3);
//             }
//             // 2. Item Tags
//             if (collectionLinkFieldIDs.indexOf(4) > -1) {
//                 linkFields.selectedFields.push(-2);
//             }
//             // 3. Item Attachments
//             if (collectionLinkFieldIDs.indexOf(5) > -1) {
//                 var attachments = sourceItem.getAttachments();
//                 for (i = 0; i < attachments.length; i++) {
//                     var attachment = attachments[i];
//                     if (attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL) {
//                         linkFields.selectedAttachments.push(attachment.id);
//                     }
//                 }
//             }
//             // 4. Item Notes
//             if (collectionLinkFieldIDs.indexOf(6) > -1) {
//                 var notes = sourceItem.getNotes();
//                 for (i = 0; i < notes.length; i++) {
//                     linkFields.selectedNotes.push(notes[i].id);
//                 }
//             }

//             return linkFields;
//         }

//         if (!linkFieldIDs) return;

//         var cert = this.lockobsvr();
//         var delayedEventIDs = [];

//         // 1. update database
//         var sql, params;

//         this.DB.beginTransaction();

//         try {
//             // insert link relationship
//             sql = "INSERT INTO collectionLinks (collection1id, collection2id) VALUES (?, ?);";
//             params = [source.id, target.id];
//             var linkid = this.DB.query(sql, params);

//             // insert link fields
//             sql = "INSERT INTO collectionLinkFields VALUES (?, ?);";
//             params = [linkid, linkFieldIDs.toString()];
//             this.DB.query(sql, params);

//             this.DB.commitTransaction();
//         }
//         catch (e) {
//             // TODO: take care of other things (e.g. delete the newly created collection)
//             // this should never happen though
//             this.DB.rollbackTransaction();
//             this.ps.alert(null,
//                           "Link Failed",
//                           "Unexpected error occurred. Please try again.");
//             this._events.executeDelayedEvents(delayedEventIDs);
//             this.unlockobsvr(cert);
//             return false;
//         }

//         // 2. update cache
//         this.collectionLinks.addLink([source.id, target.id]);

//         // 3. handle each link field
//         for (var i = 0; i < linkFieldIDs.length; i++) {
//             switch (linkFieldIDs[i]) {
//                 case 1:         // collection name
//                     // the new collection initially has the same name as the source
//                     //   so nothing needs to be done here
//                     break;
//                 case 2:         // items
//                     // link all the items
//                     var items = source.getChildItems();
//                     for (var j = 0; j < items.length; j++) {
//                         var item = items[j];
//                         // skip item attachments/notes
//                         //   since they will be taken care of by their sources
//                         if (item.getSource()) continue;
//                         this.createLink(item, target.libraryID, target.id, _createItemLinkFields(item, linkFieldIDs));
//                     }
//                     break;
//                 case 3:
//                 case 4:
//                 case 5:
//                 case 6:
//                     // these were handled when handling 2
//                     break;
//                 case 7:
//                     // link all the sub-collections
//                     var subs = source.getChildCollections();
//                     for (var j = 0; j < subs.length; j++) {
//                         // sub-collections inherit link fields from parent
//                         this.createCollectionLink(subs[j], target.libraryID, target.id, linkFieldIDs);
//                     }
//                     break;
//             }
//         }

//         this._events.executeDelayedEvents(delayedEventIDs);
//         this.unlockobsvr(cert);
//         return true;
//     },
};


// promptCreateLinkedCollection: function() {
//     // get selected collection
//     var selectedCollection = ZoteroPane.getSelectedCollection();
//     // get destination library id and collection id
//     var io = {linkType: "collection", source: selectedCollection};
//     dialog("pickDestination", "chrome,centerscreen,modal,resizable", io);
//     var result = io.out;
//     // do nothing if user hit cancel
//     if (!result || !result.accepted) {
//         return;
//     }
//     log(result);
// },











/* event handlers
 */
// function _Events(zotlink) {
//     this.zotlink = zotlink;

//     this._delayedEvents = {};
//     this._delayedEventsNextID = 1;
//     // this function does take arguments!
//     //   first argument being the event-handling function and rest being the arguments to this function
//     this.enqueueDelayedEvent = function() {
//         var handler = arguments[0];
//         var params = Array.from(arguments).slice(1);
//         this._delayedEvents[this._delayedEventsNextID] = {handler: handler, params: params, id: this._delayedEventsNextID};
//         return this._delayedEventsNextID++;
//     };
//     this.executeDelayedEvent = function(id) {
//         var event = this._delayedEvents[id];
//         if (!event) return;
//         event.handler.apply(this, event.params);
//     };
//     this.executeDelayedEvents = function(ids) {
//         for (var i = 0; i < ids.length; i++) this.executeDelayedEvent(ids[i]);
//     };

//     this.onItemDeletion = function(ids) {
//         // update db
//         // TODO: error checking (rollbackTransaction)
//         this.zotlink.DB.beginTransaction();
//         var sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE item1id IN (" + ids + ") OR item2id IN (" + ids + "));";
//         this.zotlink.DB.query(sql);
//         sql = "DELETE FROM links WHERE item1id IN (" + ids + ") OR item2id IN (" + ids + ");";
//         this.zotlink.DB.query(sql);
//         this.zotlink.DB.commitTransaction();
//         // also update the cache to reduce database access
//         for (var i = 0; i < ids.length; i++) {
//             // log event msg
//             this.zotlink.log("item " + ids[i] + " deleted!");
//             this.zotlink.links.removeLinks(ids[i]);
//         }
//     };

//     this.onItemModification = function(ids) {
//         // loop over changed items
//         for (var i = 0; i < ids.length; i++) {
//             // get the changed item
//             var id = ids[i];
//             var source = Zotero.Items.get(id);

//             // log event msg
//             this.zotlink.log("item " + id + " modified!");

//             // update all items that are linked to this item (directly and indirectly)
//             this.zotlink.syncLinks(source);
//         }
//     };

//     this.onTagModification = function(ids) {
//         for (var i = 0; i < ids.length; i++) {
//             var items = Zotero.Tags.getTagItems(ids[i]);
//             this.onItemModification(items);
//         }
//     };

//     this.onCollectionModification = function(ids) {
//         for (var i = 0; i < ids.length; i++) {
//             var collection = Zotero.Collections.get(ids[i]);
//         }
//     };

//     this.onCollectionAddition = function() {

//     };
// }
