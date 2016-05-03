var ZotLink_Fields_Picker = new function() {

    // public methods
    this.init = init;
    this.accept = accept;

    this.selectAllFields = function() { toggleAllSelectStatus(this._fieldsPool, true) };
    this.deselectAllFields = function() { toggleAllSelectStatus(this._fieldsPool, false) };
    this.selectAllAttachments = function() { toggleAllSelectStatus(this._attachmentsPool, true) };
    this.deselectAllAttachments = function() { toggleAllSelectStatus(this._attachmentsPool, false) };
    this.selectAllNotes = function() { toggleAllSelectStatus(this._notesPool, true) };
    this.deselectAllNotes = function() { toggleAllSelectStatus(this._notesPool, false) };

    // private methods/properties
    this._fieldsPool = null;
    this._attachmentsPool = null;
    this._notesPool = null;


    function init() {

        this._fieldsPool = document.getElementById("fields-pool");
        this._attachmentsPool = document.getElementById("attachments-pool");
        this._notesPool = document.getElementById("notes-pool");

        // general local variables
        var i;
        var row;
        var field;

        // fill in item information
        var item = window.arguments[0].item;
        document.getElementById("item-name").setAttribute("value", item.getDisplayTitle());
        document.getElementById("item-type").setAttribute("value", Zotero.ItemTypes.getName(item.itemTypeID));

        // fill fields pool
        // basic fields
        var fields = item.serialize().fields;
        for (field in fields) {
            // filter out invalid fields
            var fieldID = Zotero.ItemFields.getID(field);
            if (!fieldID || !Zotero.ItemFields.isValidForType(fieldID, item.itemTypeID)) continue;
            // create list item for each valid field
            row = document.createElement("listitem");
            row.setAttribute("type", "checkbox");
            row.setAttribute("checked", true);
            row.setAttribute("label", Zotero.ItemFields.getLocalizedString(item.itemTypeID, field));
            row.setAttribute("tooltiptext", Zotero.ItemFields.getLocalizedString(item.itemTypeID, field));
            row.setAttribute("value", fieldID);
            // some fields have to be synced
            switch (field) {
                case "title":
                    row.setAttribute("disabled", true);
                    break;
            }
            this._fieldsPool.appendChild(row);
        }
        // additional fields
        var more = Zotero.ZotLink.additionalFields;
        for (field in more) {
            if (!more.hasOwnProperty(field)) continue;
            row = document.createElement("listitem");
            row.setAttribute("type", "checkbox");
            row.setAttribute("checked", true);
            row.setAttribute("label", more[field].name);
            row.setAttribute("tooltiptext", more[field].name);
            row.setAttribute("value", more[field].id);
            this._fieldsPool.appendChild(row);
        }

        // fill attachments pool
        var attachments = Zotero.Items.get(item.getAttachments());
        if (!attachments.length) {
            this._attachmentsPool.disabled = true;
            document.getElementById("select-all-attachments-button").disabled = true;
            document.getElementById("deselect-all-attachments-button").disabled = true;
        }
        else {
            for (i = 0; i < attachments.length; i++) {
                var attachment = attachments[i];
                row = document.createElement("listitem");
                row.setAttribute("type", "checkbox");
                row.setAttribute("checked", attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL ? true : false);
                row.setAttribute("label", attachment.getDisplayTitle());
                row.setAttribute("tooltiptext", attachment.getDisplayTitle());
                row.setAttribute("value", attachment.id);
                row.setAttribute("disabled", attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL ? false : true);
                this._attachmentsPool.appendChild(row);
            }
        }

        // fill notes pool
        var notes = Zotero.Items.get(item.getNotes());
        if (!notes.length) {
            this._notesPool.disabled = true;
            document.getElementById("select-all-notes-button").disabled = true;
            document.getElementById("deselect-all-notes-button").disabled = true;
        }
        else {
            for (i = 0; i < notes.length; i++) {
                var note = notes[i];
                row = document.createElement("listitem");
                row.setAttribute("type", "checkbox");
                row.setAttribute("checked", false);
                row.setAttribute("label", note.getDisplayTitle());
                row.setAttribute("tooltiptext", note.getDisplayTitle());
                row.setAttribute("value", note.id);
                this._notesPool.appendChild(row);
            }
        }
    }

    function accept() {
        var selectedFields = [],
            selectedAttachments = [],
            selectedNotes = [];

        var allFields = this._fieldsPool.children;
        for (var i = 0; i < allFields.length; i++) {
            if (allFields[i].checked) {
                selectedFields.push(allFields[i].value);
            }
        }

        var allAttachments = this._attachmentsPool.children;
        for (var i = 0; i < allAttachments.length; i++) {
            if (allAttachments[i].checked) {
                selectedAttachments.push(allAttachments[i].value);
            }
        }

        var allNotes = this._notesPool.children;
        for (var i = 0; i < allNotes.length; i++) {
            if (allNotes[i].checked) {
                selectedNotes.push(allNotes[i].value);
            }
        }

        window.arguments[0].out = {
            selectedFields: selectedFields,
            selectedAttachments: selectedAttachments,
            selectedNotes: selectedNotes,
        };
    }

    function toggleAllSelectStatus(pool, selected) {
        var elements = pool.children;
        for (var i = 0; i < elements.length; i++) {
            if (!elements[i].disabled) elements[i].setAttribute("checked", selected);
        }
    }
};
