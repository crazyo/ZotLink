Zotero.ZotLink.DBManager = {

    DB: null,
    CACHE: {},
    // valid method names for querying database
    _queryMethods: ["query", "valueQuery", "rowQuery", "columnQuery"],


    initDB: function() {
        // connect to the database (create if necessary)
        this.DB = new Zotero.DBConnection("zotlink");
        // lock the database
        // IMPORTANT: during runtime of the plugin, the database and the cache are always in sync thanks to this lock
        if(!ZOTLINK_SETTINGS.DEBUG) this.DB.query("PRAGMA locking_mode=EXCLUSIVE");

        // update db
        this._updateDB();

        // build cache
        var sql = "SELECT entry1id, entry2id FROM links WHERE type=?;";
        this.CACHE.itemLinkGraph = new _LinkGraph(this.performQuery("query", sql, ["item"]));
        this.CACHE.collectionLinkGraph = new _LinkGraph(this.performQuery("query", sql, ["collection"]));

        log("database initiated, cache created as below: "); log(this.CACHE);
    },

    _updateDB: function() {
        var sql;
        var version;

        // get db version
        if (!this.DB.tableExists("system")) {
            // HARD_CODED:
            //   in first version of the plugin, table "system" didn't exist,
            //   so the existence of table "links" should be checked in order to determine
            //   whether this is a new db
            if (!this.DB.tableExists("links")) {
                // this is a new db
                //   simply initiate it and terminate
                var operations = [];
                // 1. create tables
                sql = Zotero.File.getContentsFromURL("resource://zotlink/schema/user.sql");
                operations.push(["query", sql]);
                // 2. update db version
                sql = "INSERT INTO system VALUES ('version', ?);";
                operations.push(["query", sql, [ZOTLINK_SETTINGS.CURRENT_DB_VERSION]]);

                if (!this.performTransaction(operations)) log("initiating database failed");
                return;
            }
            version = 0;
        }
        else {
            sql = "SELECT value FROM system WHERE key='version'";
            version = parseInt(this.DB.valueQuery(sql));
        }

        // run migration scripts
        while (version < ZOTLINK_SETTINGS.CURRENT_DB_VERSION) {
            sql = Zotero.File.getContentsFromURL("resource://zotlink/schema/migration/" + (++version) + ".sql");
            if (!this.performTransaction([["query", sql]])) {
                log("migration failed: script #" + version);
                // stop migration - never skip a version
                break;
            }
        }
    },

    performQuery: function(method, sql, params) {
        if (this._queryMethods.indexOf(method) === -1) {
            log("method: '" + method + "', provided for performing query is not valid");
            return false;
        }

        switch (method) {
            case "query":       return this.DB.query(sql, params);
            case "valueQuery":  return this.DB.valueQuery(sql, params);
            case "rowQuery":    return this.DB.rowQuery(sql, params);
            case "columnQuery": return this.DB.columnQuery(sql, params);
        }
    },

    performTransaction: function(operations) {
        var i;
        var method, sql, params;

        // verify each operation has a proper method
        for (i = 0; i < operations.length; i++) {
            method = operations[i][0];
            if (this._queryMethods.indexOf(method) === -1) {
                log("method: '" + method + "', provided for performing transaction is not valid");
                return false;
            }
        }

        // perform the transaction
        this.DB.beginTransaction();
        try {
            // perform each operation
            for (i = 0; i < operations.length; i++) {
                method = operations[i][0];
                sql    = operations[i][1];
                params = operations[i][2];
                switch (method) {
                    case "query":       this.DB.query(sql, params);       break;
                    case "valueQuery":  this.DB.valueQuery(sql, params);  break;
                    case "rowQuery":    this.DB.rowQuery(sql, params);    break;
                    case "columnQuery": this.DB.columnQuery(sql, params); break;
                }
            }
            this.DB.commitTransaction();
            return true;
        }
        catch (e) {
            this.DB.rollbackTransaction();
            log(e);
            return false;
        }
    },

    // DBManager API for accessing database and _LinkGraph
    /********************************************/

    // item

    addItemLink: function(item1id, item2id, fieldids) {
        // i. update database
        var sql, params;

        this.DB.beginTransaction();
        try {
            // insert link
            sql = "INSERT INTO links (entry1id, entry2id, type) VALUES (?, ?, 'item');";
            params = [item1id, item2id];
            var linkid = this.performQuery("query", sql, params);

            // insert link fields if provided
            if (fieldids) {
                sql = "INSERT INTO linkFields VALUES (?, ?);";
                params = [linkid, fieldids.toString()];
                this.performQuery("query", sql, params);
            }

            this.DB.commitTransaction();
        }
        catch (e) {
            this.DB.rollbackTransaction();
            log(e);
            return false;
        }

        // ii. update cache
        this.CACHE.itemLinkGraph.addLink([item1id, item2id]);
        return true;
    },

    // get all links involving the item with the given id
    getItemLinks: function(itemid) {
        return this.CACHE.itemLinkGraph.getLinks(itemid);
    },

    deleteItemLink: function(item1id, item2id) {
        // 1. update database
        var sql, params;
        var operations = [];

        // remove link fields info first
        sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE (entry1id=? AND entry2id=? AND type='item') OR (entry1id=? AND entry2id=? AND type='item'));";
        params = [item1id, item2id, item2id, item1id];
        operations.push(["query", sql, params]);

        // remove the actual link
        sql = "DELETE FROM links WHERE (entry1id=? AND entry2id=? AND type='item') OR (entry1id=? AND entry2id=? AND type='item');";
        params = [item1id, item2id, item2id, item1id];
        operations.push(["query", sql, params]);

        if (!this.performTransaction(operations)) return false;

        // 2. update cache
        this.CACHE.itemLinkGraph.removeLink(item1id, item2id);
        return true;
    },

    // delete all links involving the item with the given id
    deleteItemLinks: function(itemid) {
        // 1. update database
        var sql, params;
        var operations = [];

        // remove link fields info first
        sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE (entry1id=? AND type='item') OR (entry2id=? AND type='item'));";
        params = [itemid, itemid];
        operations.push(["query", sql, params]);

        // remove the actual link
        sql = "DELETE FROM links WHERE (entry1id=? AND type='item') OR (entry2id=? AND type='item');";
        params = [itemid, itemid];
        operations.push(["query", sql, params]);

        if (!this.performTransaction(operations)) return false;

        // 2. update cache
        this.CACHE.itemLinkGraph.removeLinks(itemid);
        return true;
    },

    // delete all links involving the items with the given ids
    deleteItemsLinks: function(itemids) {
        // 1. update database
        var sql;
        var operations = [];

        // remove link fields info first
        sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE (entry1id IN (" + itemids + ") AND type='item') OR (entry2id IN (" + itemids + ") AND type='item'));";
        operations.push(["query", sql]);

        // remove the actual link
        sql = "DELETE FROM links WHERE (entry1id IN (" + itemids + ") AND type='item') OR (entry2id IN (" + itemids + ") AND type='item');";
        operations.push(["query", sql]);

        if (!this.performTransaction(operations)) return false;

        // 2. update cache
        for (var i = 0; i < itemids.length; i++) {
            this.CACHE.itemLinkGraph.removeLinks(itemids[i]);
        }
        return true;
    },

    getItemLinkFields: function(itemid1, itemid2) {
        var sql = "SELECT fieldids FROM linkFields WHERE linkid=(SELECT id FROM links WHERE (entry1id=? AND entry2id=? AND type='item') OR (entry1id=? AND entry2id=? AND type='item'));";
        var params = [itemid1, itemid2, itemid2, itemid1];
        return this.performQuery("valueQuery", sql, params);
    },

    // collection

    addCollectionLink: function(collection1id, collection2id, fieldids) {
        // i. update database
        var sql, params;

        this.DB.beginTransaction();
        try {
            // insert link
            sql = "INSERT INTO links (entry1id, entry2id, type) VALUES (?, ?, 'collection');";
            params = [collection1id, collection2id];
            var linkid = this.performQuery("query", sql, params);

            // insert link fields
            sql = "INSERT INTO linkFields VALUES (?, ?);";
            params = [linkid, fieldids.toString()];
            this.performQuery("query", sql, params);

            this.DB.commitTransaction();
        }
        catch (e) {
            this.DB.rollbackTransaction();
            log(e);
            return false;
        }

        // ii. update cache
        this.CACHE.collectionLinkGraph.addLink([collection1id, collection2id]);
        return true;
    },

    // get all links involving the collection with the given id
    getCollectionLinks: function(collectionid) {
        return this.CACHE.collectionLinkGraph.getLinks(collectionid);
    },

    getCollectionRelatives: function(collectionid) {
        return this.CACHE.collectionLinkGraph.getRelatives(collectionid);
    },

    deleteCollectionLink: function(collection1id, collection2id) {
        // 1. update database
        var sql, params;
        var operations = [];

        // remove link fields info first
        sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE (entry1id=? AND entry2id=? AND type='collection') OR (entry1id=? AND entry2id=? AND type='collection'));";
        params = [collection1id, collection2id, collection2id, collection1id];
        operations.push(["query", sql, params]);

        // remove the actual link
        sql = "DELETE FROM links WHERE (entry1id=? AND entry2id=? AND type='collection') OR (entry1id=? AND entry2id=? AND type='collection');";
        params = [collection1id, collection2id, collection2id, collection1id];
        operations.push(["query", sql, params]);

        if (!this.performTransaction(operations)) return false;

        // 2. update cache
        this.CACHE.collectionLinkGraph.removeLink(collection1id, collection2id);
        return true;
    },

    // delete all links involving the collection with the given id
    deleteCollectionLinks: function(collectionid) {
        // 1. update database
        var sql, params;
        var operations = [];

        // remove link fields info first
        sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE (entry1id=? AND type='collection') OR (entry2id=? AND type='collection'));";
        params = [collectionid, collectionid];
        operations.push(["query", sql, params]);

        // remove the actual link
        sql = "DELETE FROM links WHERE (entry1id=? AND type='collection') OR (entry2id=? AND type='collection');";
        params = [collectionid, collectionid];
        operations.push(["query", sql, params]);

        if (!this.performTransaction(operations)) return false;

        // 2. update cache
        this.CACHE.collectionLinkGraph.removeLinks(collectionid);
        return true;
    },

    deleteCollectionsLinks: function(collectionids) {
        // 1. update database
        var sql;
        var operations = [];

        // remove link fields info first
        sql = "DELETE FROM linkFields WHERE linkid IN (SELECT id FROM links WHERE (entry1id IN (" + collectionids + ") AND type='collection') OR (entry2id IN (" + collectionids + ") AND type='collection'));";
        operations.push(["query", sql]);

        // remove the actual link
        sql = "DELETE FROM links WHERE (entry1id IN (" + collectionids + ") AND type='collection') OR (entry2id IN (" + collectionids + ") AND type='collection');";
        operations.push(["query", sql]);

        if (!this.performTransaction(operations)) return false;

        // 2. update cache
        for (var i = 0; i < collectionids.length; i++) {
            this.CACHE.collectionLinkGraph.removeLinks(collectionids[i]);
        }
        return true;
    },

    getCollectionLinkFields: function(collectionid1, collectionid2) {
        var sql = "SELECT fieldids FROM linkFields WHERE linkid=(SELECT id FROM links WHERE (entry1id=? AND entry2id=? AND type='collection') OR (entry1id=? AND entry2id=? AND type='collection'));";
        var params = [collectionid1, collectionid2, collectionid2, collectionid1];
        return this.performQuery("valueQuery", sql, params);
    },

};

/************************************************/

/* implementation of graph data structure where nodes are the entries and
 * edges are the links
 */
function _LinkGraph(pairs) {
    // the graph inner representation of the linked entries (will build later)
    this.graph = {};

    // connect linked pair in the graph
    this.addLink = function(pair) {
        var entry1id = pair[0],
            entry2id = pair[1];

        if (!this.graph.hasOwnProperty(entry1id)) {
            this.graph[entry1id] = [parseInt(entry2id)];
        }
        else {
            this.graph[entry1id].push(parseInt(entry2id));
        }
        if (!this.graph.hasOwnProperty(entry2id)) {
            this.graph[entry2id] = [parseInt(entry1id)];
        }
        else {
            this.graph[entry2id].push(parseInt(entry1id));
        }
    };

    this.getLinks = function(entryid) {
        return this.graph[entryid] || [];
    };

    // find id of all relatives to the given entry using BFS
    this.getRelatives = function(entryid) {
        var tovisit = [entryid],
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

        // the first entry in the visited list is the given entry itself
        visted.shift();
        return visted;
    };

    this.removeLink = function(entry1id, entry2id) {
        if (this.graph[entry1id] && this.graph[entry1id].indexOf(entry2id) > -1) {
            this.graph[entry1id].splice(this.graph[entry1id].indexOf(entry2id), 1);
            if (!this.graph[entry1id].length) delete this.graph[entry1id];
        }
        if (this.graph[entry2id] && this.graph[entry2id].indexOf(entry1id) > -1) {
            this.graph[entry2id].splice(this.graph[entry2id].indexOf(entry1id), 1);
            if (!this.graph[entry2id].length) delete this.graph[entry2id];
        }
    };

    // remove all links to the entry
    this.removeLinks = function(entryid) {
        if (!this.graph[entryid]) {
            return;
        }

        delete this.graph[entryid];
        for (var source in this.graph) {
            // skip if the current property is not an entry
            if (!this.graph.hasOwnProperty(source)) {
                continue;
            }

            for (var j = 0; j < this.graph[source].length; j++) {
                if (this.graph[source][j] === entryid) {
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
            // HARD_CODED:
            //   pairs provided is a list of objects
            //   each has an entry1id attribute and an entry2id attribute
            this.addLink([pairs[i].entry1id, pairs[i].entry2id]);
        }
    };
    this._buildGraph(pairs);
}
