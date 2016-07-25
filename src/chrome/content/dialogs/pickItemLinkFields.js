var ZotLink_Pick_Item_Link_Fields_Dialog = new function() {

    // public methods
    this.init = init;
    this.accept = accept;

    this.selectAllBasicFields = function() { _toggleAllSelectStatus(this._basicFieldsListbox, true) };
    this.deselectAllBasicFields = function() { _toggleAllSelectStatus(this._basicFieldsListbox, false) };
    this.selectAllAttachments = function() { _toggleAllSelectStatus(this._attachmentsListbox, true) };
    this.deselectAllAttachments = function() { _toggleAllSelectStatus(this._attachmentsListbox, false) };
    this.selectAllNotes = function() { _toggleAllSelectStatus(this._notesListbox, true) };
    this.deselectAllNotes = function() { _toggleAllSelectStatus(this._notesListbox, false) };

    // private methods/properties
    this._basicFieldsListbox = null;
    this._attachmentsListbox = null;
    this._notesListbox = null;


    function init() {

        this._basicFieldsListbox = document.getElementById("basic-fields-listbox");
        this._attachmentsListbox = document.getElementById("attachments-listbox");
        this._notesListbox = document.getElementById("notes-listbox");

        // general local variables
        var i;
        var row;
        var field;

        // fill in item information
        var item = window.arguments[0].item;
        document.getElementById("item-name").setAttribute("value", item.getDisplayTitle());
        document.getElementById("item-type").setAttribute("value", Zotero.ItemTypes.getName(item.itemTypeID));

        // fill basic fields listbox
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
            // switch (field) {
            //     case "title":
            //         row.setAttribute("disabled", true);
            //         break;
            // }
            this._basicFieldsListbox.appendChild(row);
        }
        // additional fields
        // HARD_CODED:
        //   keep in consistence with hardcode.js
        //   1. Creators
        row = document.createElement("listitem");
        row.setAttribute("type", "checkbox");
        row.setAttribute("checked", true);
        row.setAttribute("label", "Creators");
        row.setAttribute("tooltiptext", "Creators");
        row.setAttribute("value", -1);
        this._basicFieldsListbox.appendChild(row);
        //   2. Tags
        row = document.createElement("listitem");
        row.setAttribute("type", "checkbox");
        row.setAttribute("checked", true);
        row.setAttribute("label", "Tags");
        row.setAttribute("tooltiptext", "Tags");
        row.setAttribute("value", -2);
        this._basicFieldsListbox.appendChild(row);

        // fill attachments listbox
        var attachments = Zotero.Items.get(item.getAttachments());
        if (!attachments.length) {
            this._attachmentsListbox.disabled = true;
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
                this._attachmentsListbox.appendChild(row);
            }
        }

        // fill notes listbox
        var notes = Zotero.Items.get(item.getNotes());
        if (!notes.length) {
            this._notesListbox.disabled = true;
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
                this._notesListbox.appendChild(row);
            }
        }
    }

    function accept() {
        var selectedBasicFields = [],
            selectedAttachments = [],
            selectedNotes = [];

        var allBasicFields = this._basicFieldsListbox.children;
        for (var i = 0; i < allBasicFields.length; i++) {
            if (allBasicFields[i].checked) {
                selectedBasicFields.push(allBasicFields[i].value);
            }
        }

        var allAttachments = this._attachmentsListbox.children;
        for (var i = 0; i < allAttachments.length; i++) {
            if (allAttachments[i].checked) {
                selectedAttachments.push(allAttachments[i].value);
            }
        }

        var allNotes = this._notesListbox.children;
        for (var i = 0; i < allNotes.length; i++) {
            if (allNotes[i].checked) {
                selectedNotes.push(allNotes[i].value);
            }
        }

        window.arguments[0].out = {
            selectedBasicFields: selectedBasicFields,
            selectedAttachments: selectedAttachments,
            selectedNotes: selectedNotes,
        };
    }

    function _toggleAllSelectStatus(listbox, selected) {
        var elements = listbox.children;
        for (var i = 0; i < elements.length; i++) {
            if (!elements[i].disabled) elements[i].setAttribute("checked", selected);
        }
    }
};
