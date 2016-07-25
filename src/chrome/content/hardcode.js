// this file serves the only purpose as a reference
// it is not used for running ZotLink
// it states the rules for hard-coded logics in ZotLink

var ZOTLINK_HARDCODE = {

// additional item fields
ADDITIONAL_ITEM_FIELDS: {
    // start from -1 downwards so as not to conflict with regular field ids
    Creators: {
        name:    "Creators",
        id:      -1,
        applyTo: ["regular"],
    },
    Tags: {
        name:    "Tags",
        id:      -2,
        applyTo: ["regular", "attachment", "note"],
    },
    Notes: {
        name:    "Notes",
        id:      -3,
        applyTo: ["attachment", "note"],
    },
},

// collection link fields
COLLECTION_LINK_FIELDS: {
    Name: {
        name: "Name",
        id:   1,
    },
    Items: {
        name: "Items",
        id:   2,
    },
    ItemInfo: {
        name: "ItemInfo",
        id:   3,
    },
    ItemTags: {
        name: "ItemTags",
        id:   4,
    },
    ItemAttachments: {
        name: "ItemAttachments",
        id:   5,
    },
    ItemNotes: {
        name: "ItemNotes",
        id:   6,
    },
    Subcollections: {
        name: "Subcollections",
        id:   7,
    },
},

};
