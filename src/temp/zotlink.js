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


};


