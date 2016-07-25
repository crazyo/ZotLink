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

    // _LinkGraph API
    /********************************************/

    getItemLinks: function(itemid) {
        return this.CACHE.itemLinkGraph.getLinks(itemid);
    },
};

/************************************************/

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

    this.getLinks = function(itemid) {
        return this.graph[itemid] || [];
    };

    // find id of all relatives to the given item using BFS
    this.getRelatives = function(itemid) {
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
            // HARD_CODED:
            //   pairs provided is a list of objects
            //   each has an entry1id attribute and an entry2id attribute
            this.addLink([pairs[i].entry1id, pairs[i].entry2id]);
        }
    };
    this._buildGraph(pairs);
}
