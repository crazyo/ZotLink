var ZotLink_Pick_Item_Merge_Link_Fields_Dialog = new function() {

    // public methods
    this.init = init;
    this.accept = accept;

    // private methods/properties
    this._EMPTY_PLACEHOLDER = "<empty>";
    this._DEFAULT_SEPARATOR = ", ";
    this._generateElementValue = function(value, sorter) {
        return value instanceof Array ? JSON.stringify(value.sort(sorter)) : JSON.stringify(value);
    };
    this._generateElementValueDisplay = function(value, sorter, separator) {
        if (value instanceof Array) {
            return value.length ?
                   value.sort(sorter).join(separator || this._DEFAULT_SEPARATOR) :
                   this._EMPTY_PLACEHOLDER;
        } else {
            return value || this._EMPTY_PLACEHOLDER;
        }
    };
    this._setElementValue = function(element, elementValue, elementValueDisplay) {
        if (elementValueDisplay === undefined) elementValueDisplay = elementValue;
        element.setAttribute("label", elementValueDisplay || this._EMPTY_PLACEHOLDER);
        element.setAttribute("tooltiptext", elementValueDisplay || this._EMPTY_PLACEHOLDER);
        element.setAttribute("value", elementValue);
    };

    this._item1BasicFieldRowClassName = "item1-basic-field";
    this._item2BasicFieldRowClassName = "item2-basic-field";
    this._item1BasicFieldRowIdPrefix = "item1-basic-field-";
    this._item2BasicFieldRowIdPrefix = "item2-basic-field-";
    this._item1BasicFieldCheckboxClassName = "item1-basic-field-checkbox";
    this._item2BasicFieldCheckboxClassName = "item2-basic-field-checkbox";
    this._item1BasicFieldCurrentValueClassName = "item1-basic-field-current-value";
    this._item2BasicFieldCurrentValueClassName = "item2-basic-field-current-value";
    this._item1BasicFieldMergedValueClassName = "item1-basic-field-merged-value";
    this._item2BasicFieldMergedValueClassName = "item2-basic-field-merged-value";
    this._item1AttachmentRowClassName = "item1-attachment";
    this._item2AttachmentRowClassName = "item2-attachment";
    this._item1NoteRowClassName = "item1-note";
    this._item2NoteRowClassName = "item2-note";

    this._item1 = window.arguments[0].source;
    this._item2 = window.arguments[0].target;
    function _registerElements() {
        function _get(id) { return document.getElementById(id); }
        this._item1NameLabel = _get("item1-name");
        this._item1TypeLabel = _get("item1-type");
        this._item1LibraryLabel = _get("item1-library");
        this._item1CollectionLabel = _get("item1-collection");
        this._item2NameLabel = _get("item2-name");
        this._item2TypeLabel = _get("item2-type");
        this._item2LibraryLabel = _get("item2-library");
        this._item2CollectionLabel = _get("item2-collection");
        this._item1BasicFieldsListbox = _get("item1-basic-fields-listbox");
        this._item1BasicFieldsSelectAllButton = _get("item1-select-all-basic-fields-button");
        this._item1BasicFieldsDeselectAllButton = _get("item1-deselect-all-basic-fields-button");
        this._item2BasicFieldsListbox = _get("item2-basic-fields-listbox");
        this._item2BasicFieldsSelectAllButton = _get("item2-select-all-basic-fields-button");
        this._item2BasicFieldsDeselectAllButton = _get("item2-deselect-all-basic-fields-button");
        this._item1TagsListbox = _get("item1-tags-listbox");
        this._item1TagsSelectAllButton = _get("item1-select-all-tags-button");
        this._item1TagsDeselectAllButton = _get("item1-deselect-all-tags-button");
        this._item2TagsListbox = _get("item2-tags-listbox");
        this._item2TagsSelectAllButton = _get("item2-select-all-tags-button");
        this._item2TagsDeselectAllButton = _get("item2-deselect-all-tags-button");
        this._item1AttachmentsListbox = _get("item1-attachments-listbox");
        this._item1AttachmentsSelectAllButton = _get("item1-select-all-attachments-button");
        this._item1AttachmentsDeselectAllButton = _get("item1-deselect-all-attachments-button");
        this._item2AttachmentsListbox = _get("item2-attachments-listbox");
        this._item2AttachmentsSelectAllButton = _get("item2-select-all-attachments-button");
        this._item2AttachmentsDeselectAllButton = _get("item2-deselect-all-attachments-button");
        this._item1NotesListbox = _get("item1-notes-listbox");
        this._item1NotesSelectAllButton = _get("item1-select-all-notes-button");
        this._item1NotesDeselectAllButton = _get("item1-deselect-all-notes-button");
        this._item2NotesListbox = _get("item2-notes-listbox");
        this._item2NotesSelectAllButton = _get("item2-select-all-notes-button");
        this._item2NotesDeselectAllButton = _get("item2-deselect-all-notes-button");
    }

    this._registerElements = _registerElements;
    this._populateItemInfo = _populateItemInfo;
    this._populateListboxes = _populateListboxes;
    this._registerBatchButtons = _registerBatchButtons;
    this._addEventListeners = _addEventListeners;

    this._EVENT_CHECKBOX_CHECK = new Event("check");

    this._setValueChangeAfterMergeIndicator = _setValueChangeAfterMergeIndicator;
    this._setFieldNotLinkedIndicator = _setFieldNotLinkedIndicator;
    this._unsetIndicators = _unsetIndicators;


    function init() {
        this._registerElements();

        this._populateItemInfo();
        this._populateListboxes();
        this._registerBatchButtons();
        this._addEventListeners();
    }

    function accept() {
        var selectedBasicFields = {},
            selectedAttachments = {},
            selectedNotes = {};

        var selector;

        selector = "." + this._item1BasicFieldRowClassName;
        var item1BasicFields = this._item1BasicFieldsListbox.querySelectorAll(selector);
        for (var i = 0; i < item1BasicFields.length; i++) {
            if (item1BasicFields[i].querySelector("checkbox").checked) {
                selectedBasicFields[item1BasicFields[i].value] = this._item1.id;
            }
        }
        selector = "." + this._item2BasicFieldRowClassName;
        var item2BasicFields = this._item2BasicFieldsListbox.querySelectorAll(selector);
        for (var i = 0; i < item2BasicFields.length; i++) {
            if (item2BasicFields[i].querySelector("checkbox").checked) {
                selectedBasicFields[item2BasicFields[i].value] = this._item2.id;
            }
        }

        selector = "." + this._item1AttachmentRowClassName;
        var item1Attachments = this._item1AttachmentsListbox.querySelectorAll(selector);
        for (var i = 0; i < item1Attachments.length; i++) {
            if (item1Attachments[i].checked) {
                selectedAttachments[item1Attachments[i].value] = this._item1.id;
            }
        }
        selector = "." + this._item2AttachmentRowClassName;
        var item2Attachments = this._item2AttachmentsListbox.querySelectorAll(selector);
        for (var i = 0; i < item2Attachments.length; i++) {
            if (item2Attachments[i].checked) {
                selectedAttachments[item2Attachments[i].value] = this._item2.id;
            }
        }

        selector = "." + this._item1NoteRowClassName;
        var item1Notes = this._item1NotesListbox.querySelectorAll(selector);
        for (var i = 0; i < item1Notes.length; i++) {
            if (item1Notes[i].checked) {
                selectedNotes[item1Notes[i].value] = this._item1.id;
            }
        }
        selector = "." + this._item2NoteRowClassName;
        var item2Notes = this._item2NotesListbox.querySelectorAll(selector);
        for (var i = 0; i < item2Notes.length; i++) {
            if (item2Notes[i].checked) {
                selectedNotes[item2Notes[i].value] = this._item2.id;
            }
        }

        window.arguments[0].out = {
            selectedBasicFields: selectedBasicFields,
            selectedAttachments: selectedAttachments,
            selectedNotes: selectedNotes,
        };
    }

    function _populateItemInfo() {
        var i;
        var collectionIDs, collectionNames;

        this._item1NameLabel.setAttribute("value", this._item1.getDisplayTitle());
        this._item1TypeLabel.setAttribute("value", Zotero.ItemTypes.getName(this._item1.itemTypeID));
        this._item1LibraryLabel.setAttribute("value", Zotero.Libraries.getName(this._item1.libraryID));
        collectionNames = [];
        collectionIDs = this._item1.getCollections();
        for (i = 0; i < collectionIDs.length; i++) {
            collectionNames.push(Zotero.Collections.get(collectionIDs[i]).name);
        }
        this._item1CollectionLabel.setAttribute("value", collectionNames.join(this._DEFAULT_SEPARATOR));

        this._item2NameLabel.setAttribute("value", this._item2.getDisplayTitle());
        this._item2TypeLabel.setAttribute("value", Zotero.ItemTypes.getName(this._item2.itemTypeID));
        this._item2LibraryLabel.setAttribute("value", Zotero.Libraries.getName(this._item2.libraryID));
        collectionNames = [];
        collectionIDs = this._item2.getCollections();
        for (i = 0; i < collectionIDs.length; i++) {
            collectionNames.push(Zotero.Collections.get(collectionIDs[i]).name);
        }
        this._item2CollectionLabel.setAttribute("value", collectionNames.join(this._DEFAULT_SEPARATOR));
    }

    function _populateListboxes() {
        var dialog = this;

        var i;
        var row1, row2, cell, checkbox;
        var currentValue1, currentValue2, currentValueDisplay1, currentValueDisplay2;

        var item1 = dialog._item1;
        var item2 = dialog._item2;
        // basic fields
        // make sure item1 and item2 have same basic fields
        //   - they should, because they are of the same type
        var fields = item1.serialize().fields;
        if (Object.keys(fields).sort().join() !== Object.keys(item2.serialize().fields).sort().join()) {
            var error = document.createElement("listitem");
            var msg = document.createElement("p");
            msg.innerHTML = "UNEXPECTED ERROR! Items have different fields!";
            error.appendChild(msg);
            dialog._item1BasicFieldsListbox.innerHTML = error.outerHTML;
            dialog._item2BasicFieldsListbox.innerHTML = error.outerHTML;
        }
        for (var field in fields) {
            // filter out invalid fields
            var fieldID = Zotero.ItemFields.getID(field);
            if (!fieldID ||
                !Zotero.ItemFields.isValidForType(fieldID, item1.itemTypeID) ||
                !Zotero.ItemFields.isValidForType(fieldID, item2.itemTypeID)) continue;

            // create list item for each valid field
            row1 = document.createElement("listitem");
            row2 = document.createElement("listitem");
            row1.setAttribute("class", dialog._item1BasicFieldRowClassName);
            row1.setAttribute("id", dialog._item1BasicFieldRowIdPrefix + Zotero.ItemFields.getName(field));
            row2.setAttribute("class", dialog._item2BasicFieldRowClassName);
            row2.setAttribute("id", dialog._item2BasicFieldRowIdPrefix + Zotero.ItemFields.getName(field));

            // checkbox
            cell = document.createElement("listcell");
            checkbox = document.createElement("checkbox");
            checkbox.setAttribute("class", dialog._item1BasicFieldCheckboxClassName);
            checkbox.setAttribute("checked", true);
            cell.appendChild(checkbox);
            row1.appendChild(cell);
            cell = document.createElement("listcell");
            checkbox = document.createElement("checkbox");
            checkbox.setAttribute("class", dialog._item2BasicFieldCheckboxClassName);
            checkbox.setAttribute("checked", false);
            cell.appendChild(checkbox);
            row2.appendChild(cell);
            // field name
            cell = document.createElement("listcell");
            dialog._setElementValue(cell, Zotero.ItemFields.getLocalizedString(item1.itemTypeID, field));
            row1.appendChild(cell);
            row2.appendChild(cell.cloneNode(true));
            // current field value
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item1BasicFieldCurrentValueClassName);
            currentValue1 = item1.getField(Zotero.ItemFields.getName(field));
            dialog._setElementValue(cell, currentValue1);
            row1.appendChild(cell);
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item2BasicFieldCurrentValueClassName);
            currentValue2 = item2.getField(Zotero.ItemFields.getName(field));
            dialog._setElementValue(cell, currentValue2);
            row2.appendChild(cell);
            // merged field value
            //   initially all item1 field values are selected to be merged values
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item1BasicFieldMergedValueClassName);
            dialog._setElementValue(cell, currentValue1);
            row1.appendChild(cell);
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item2BasicFieldMergedValueClassName);
            dialog._setElementValue(cell, currentValue1);
            if (currentValue1 !== currentValue2) dialog._setValueChangeAfterMergeIndicator(cell);
            row2.appendChild(cell);

            row1.setAttribute("value", fieldID);
            dialog._item1BasicFieldsListbox.appendChild(row1);
            row2.setAttribute("value", fieldID);
            dialog._item2BasicFieldsListbox.appendChild(row2);
        }
        // additional fields
        // HARD_CODED:
        //   keep in consistence with hardcode.js
        //   1. Creators
        {
            var creatorIDs, creatorNames, creators, creator, creatorType;

            row1 = document.createElement("listitem");
            row1.setAttribute("class", dialog._item1BasicFieldRowClassName);
            row1.setAttribute("id", dialog._item1BasicFieldRowIdPrefix + "creators");
            row2 = document.createElement("listitem");
            row2.setAttribute("class", dialog._item2BasicFieldRowClassName);
            row2.setAttribute("id", dialog._item2BasicFieldRowIdPrefix + "creators");

            // checkbox
            cell = document.createElement("listcell");
            checkbox = document.createElement("checkbox");
            checkbox.setAttribute("class", dialog._item1BasicFieldCheckboxClassName);
            checkbox.setAttribute("checked", true);
            cell.appendChild(checkbox);
            row1.appendChild(cell);
            cell = document.createElement("listcell");
            checkbox = document.createElement("checkbox");
            checkbox.setAttribute("class", dialog._item2BasicFieldCheckboxClassName);
            checkbox.setAttribute("checked", false);
            cell.appendChild(checkbox);
            row2.appendChild(cell);
            // field name
            cell = document.createElement("listcell");
            dialog._setElementValue(cell, "Creators");
            row1.appendChild(cell);
            row2.appendChild(cell.cloneNode(true));
            // current field value
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item1BasicFieldCurrentValueClassName);
            creatorIDs = [];
            creatorNames = [];
            creators = item1.getCreators();
            for (i = 0; i < creators.length; i++) {
                creator = creators[i].ref;
                creatorType = Zotero.CreatorTypes.getLocalizedString(creators[i].creatorTypeID);
                creatorIDs.push(creator.id);
                creatorNames.push(creatorType + ": " + creator.firstName + " " + creator.lastName);
            }
            currentValue1 = dialog._generateElementValue(creatorIDs);
            currentValueDisplay1 = dialog._generateElementValueDisplay(creatorNames, undefined, "; ");
            dialog._setElementValue(cell, currentValue1, currentValueDisplay1);
            row1.appendChild(cell);
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item2BasicFieldCurrentValueClassName);
            creatorIDs = [];
            creatorNames = [];
            creators = item2.getCreators();
            for (i = 0; i < creators.length; i++) {
                creator = creators[i].ref;
                creatorType = Zotero.CreatorTypes.getLocalizedString(creators[i].creatorTypeID);
                creatorIDs.push(creator.id);
                creatorNames.push(creatorType + ": " + creator.firstName + " " + creator.lastName);
            }
            currentValue2 = dialog._generateElementValue(creatorIDs);
            currentValueDisplay2 = dialog._generateElementValueDisplay(creatorNames, undefined, "; ");
            dialog._setElementValue(cell, currentValue2, currentValueDisplay2);
            row2.appendChild(cell);
            // merged field value
            //   initially all item1 field values are selected to be merged values
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item1BasicFieldMergedValueClassName);
            dialog._setElementValue(cell, currentValue1, currentValueDisplay1);
            row1.appendChild(cell);
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item2BasicFieldMergedValueClassName);
            dialog._setElementValue(cell, currentValue1, currentValueDisplay1);
            if (currentValue1 !== currentValue2) dialog._setValueChangeAfterMergeIndicator(cell);
            row2.appendChild(cell);

            row1.setAttribute("value", -1);
            dialog._item1BasicFieldsListbox.appendChild(row1);
            row2.setAttribute("value", -1);
            dialog._item2BasicFieldsListbox.appendChild(row2);
        }
        //   2. Tags
        {
            var tagIDs, tagNames, tags, tag;

            row1 = document.createElement("listitem");
            row1.setAttribute("class", dialog._item1BasicFieldRowClassName);
            row1.setAttribute("id", dialog._item1BasicFieldRowIdPrefix + "tags");
            row2 = document.createElement("listitem");
            row2.setAttribute("class", dialog._item2BasicFieldRowClassName);
            row2.setAttribute("id", dialog._item2BasicFieldRowIdPrefix + "tags");

            // checkbox
            cell = document.createElement("listcell");
            checkbox = document.createElement("checkbox");
            checkbox.setAttribute("class", dialog._item1BasicFieldCheckboxClassName);
            checkbox.setAttribute("checked", true);
            cell.appendChild(checkbox);
            row1.appendChild(cell);
            cell = document.createElement("listcell");
            checkbox = document.createElement("checkbox");
            checkbox.setAttribute("class", dialog._item2BasicFieldCheckboxClassName);
            checkbox.setAttribute("checked", false);
            cell.appendChild(checkbox);
            row2.appendChild(cell);
            // field name
            cell = document.createElement("listcell");
            dialog._setElementValue(cell, "Tags");
            row1.appendChild(cell);
            row2.appendChild(cell.cloneNode(true));
            // current field value
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item1BasicFieldCurrentValueClassName);
            tagIDs = [];
            tagNames = [];
            tags = item1.getTags();
            for (i = 0; i < tags.length; i++) {
                tag = tags[i];
                tagIDs.push(tag.id);
                tagNames.push(tag.name);
            }
            currentValue1 = dialog._generateElementValue(tagIDs);
            currentValueDisplay1 = dialog._generateElementValueDisplay(tagNames);
            dialog._setElementValue(cell, currentValue1, currentValueDisplay1);
            row1.appendChild(cell);
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item2BasicFieldCurrentValueClassName);
            tagIDs = [];
            tagNames = [];
            tags = item2.getTags();
            for (i = 0; i < tags.length; i++) {
                tag = tags[i];
                tagIDs.push(tag.id);
                tagNames.push(tag.name);
            }
            currentValue2 = dialog._generateElementValue(tagIDs);
            currentValueDisplay2 = dialog._generateElementValueDisplay(tagNames);
            dialog._setElementValue(cell, currentValue2, currentValueDisplay2);
            row2.appendChild(cell);
            // merged field value
            //   initially all item1 field values are selected to be merged values
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item1BasicFieldMergedValueClassName);
            dialog._setElementValue(cell, currentValue1, currentValueDisplay1);
            row1.appendChild(cell);
            cell = document.createElement("listcell");
            cell.setAttribute("class", dialog._item2BasicFieldMergedValueClassName);
            dialog._setElementValue(cell, currentValue1, currentValueDisplay1);
            if (currentValue1 !== currentValue2) dialog._setValueChangeAfterMergeIndicator(cell);
            row2.appendChild(cell);

            row1.setAttribute("value", -2);
            dialog._item1BasicFieldsListbox.appendChild(row1);
            row2.setAttribute("value", -2);
            dialog._item2BasicFieldsListbox.appendChild(row2);
        }

        // attachments
        var attachments, attachment;

        attachments = Zotero.Items.get(item1.getAttachments());
        if (!attachments.length) {
            dialog._item1AttachmentsListbox.disabled = true;
            dialog._item1AttachmentsSelectAllButton.disabled = true;
            dialog._item1AttachmentsDeselectAllButton.disabled = true;
        }
        for (i = 0; i < attachments.length; i++) {
            attachment = attachments[i];
            row1 = document.createElement("listitem");
            row1.setAttribute("class", dialog._item1AttachmentRowClassName);
            row1.setAttribute("type", "checkbox");
            dialog._setElementValue(row1, attachment.id, attachment.getDisplayTitle());
            row1.setAttribute("checked", attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL);
            row1.setAttribute("disabled", !(attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL));
            dialog._item1AttachmentsListbox.appendChild(row1);
        }
        attachments = Zotero.Items.get(item2.getAttachments());
        if (!attachments.length) {
            dialog._item2AttachmentsListbox.disabled = true;
            dialog._item2AttachmentsSelectAllButton.disabled = true;
            dialog._item2AttachmentsDeselectAllButton.disabled = true;
        }
        for (i = 0; i < attachments.length; i++) {
            attachment = attachments[i];
            row2 = document.createElement("listitem");
            row2.setAttribute("class", dialog._item2AttachmentRowClassName);
            row2.setAttribute("type", "checkbox");
            dialog._setElementValue(row2, attachment.id, attachment.getDisplayTitle());
            row2.setAttribute("checked", attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL);
            row2.setAttribute("disabled", !(attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL));
            dialog._item2AttachmentsListbox.appendChild(row2);
        }

        // notes
        var notes, note;

        notes = Zotero.Items.get(item1.getNotes());
        if (!notes.length) {
            dialog._item1NotesListbox.disabled = true;
            dialog._item1NotesSelectAllButton.disabled = true;
            dialog._item1NotesDeselectAllButton.disabled = true;
        }
        for (i = 0; i < notes.length; i++) {
            note = notes[i];
            row1 = document.createElement("listitem");
            row1.setAttribute("class", dialog._item1NoteRowClassName);
            row1.setAttribute("type", "checkbox");
            dialog._setElementValue(row1, note.id, note.getDisplayTitle());
            row1.setAttribute("checked", false);
            dialog._item1NotesListbox.appendChild(row1);
        }
        notes = Zotero.Items.get(item2.getNotes());
        if (!notes.length) {
            dialog._item2NotesListbox.disabled = true;
            dialog._item2NotesSelectAllButton.disabled = true;
            dialog._item2NotesDeselectAllButton.disabled = true;
        }
        for (i = 0; i < notes.length; i++) {
            note = notes[i];
            row2 = document.createElement("listitem");
            row2.setAttribute("class", dialog._item2NoteRowClassName);
            row2.setAttribute("type", "checkbox");
            dialog._setElementValue(row2, note.id, note.getDisplayTitle());
            row2.setAttribute("checked", false);
            dialog._item2NotesListbox.appendChild(row2);
        }
    }

    function _registerBatchButtons() {
        var dialog = this;

        function _registerSelectAllButton(button) {
            button.onclick = function() {
                var elements = button.closest("groupbox").querySelector("listbox").querySelectorAll("listitem");
                for (var i = 0; i < elements.length; i++) {
                    if (!elements[i].disabled) {
                        var checkbox = elements[i].querySelector("checkbox");
                        if (!checkbox.checked) {
                            checkbox.checked = true;
                            checkbox.dispatchEvent(dialog._EVENT_CHECKBOX_CHECK);
                        }
                    }
                }
            };
        }
        function _registerDeselectAllButton(button) {
            button.onclick = function() {
                var elements = button.closest("groupbox").querySelector("listbox").querySelectorAll("listitem");
                for (var i = 0; i < elements.length; i++) {
                    if (!elements[i].disabled) {
                        var checkbox = elements[i].querySelector("checkbox");
                        if (checkbox.checked) {
                            checkbox.checked = false;
                            checkbox.dispatchEvent(dialog._EVENT_CHECKBOX_CHECK);
                        }
                    }
                }
            };
        }

        var i;
        var button;

        var selectAllButtons = document.getElementsByClassName("select-all-button");
        for (i = 0; i < selectAllButtons.length; i++) {
            button = selectAllButtons[i];
            _registerSelectAllButton(button);
        }

        var deselectAllButtons = document.getElementsByClassName("deselect-all-button");
        for (i = 0; i < deselectAllButtons.length; i++) {
            button = deselectAllButtons[i];
            _registerDeselectAllButton(button);
        }
    }

    function _addEventListeners() {
        var dialog = this;
        var item1BasicFieldRows = dialog._item1BasicFieldsListbox.querySelectorAll("." + dialog._item1BasicFieldRowClassName);
        var item2BasicFieldRows = dialog._item2BasicFieldsListbox.querySelectorAll("." + dialog._item2BasicFieldRowClassName);

        function _addItem1BasicFieldRowOnclick(rowIndex) {
            var item1BasicFieldRow = item1BasicFieldRows[rowIndex];
            item1BasicFieldRow.addEventListener("click", function() {
                var checkbox = this.querySelector("checkbox");
                if (!checkbox.disabled) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(dialog._EVENT_CHECKBOX_CHECK);
                }
                // for each field, at most one of them (in item1 listbox and item2 listbox) can be selected
                if (checkbox.checked) {
                    item2BasicFieldRows[rowIndex].querySelector("checkbox").checked = false;
                }
            });
        }
        function _addItem2BasicFieldRowOnclick(rowIndex) {
            var item2BasicFieldRow = item2BasicFieldRows[rowIndex];
            item2BasicFieldRow.addEventListener("click", function() {
                var checkbox = this.querySelector("checkbox");
                if (!checkbox.disabled) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(dialog._EVENT_CHECKBOX_CHECK);
                }
                // for each field, at most one of them (in item1 listbox and item2 listbox) can be selected
                if (checkbox.checked) {
                    item1BasicFieldRows[rowIndex].querySelector("checkbox").checked = false;
                }
            });
        }

        function _addItem1BasicFieldCheckboxOncheckEnsureExclusiveness(rowIndex) {
            var checkbox = item1BasicFieldRows[rowIndex].querySelector("checkbox");
            checkbox.addEventListener("check", function() {
                if (checkbox.checked) {
                    item2BasicFieldRows[rowIndex].querySelector("checkbox").checked = false;
                }
            });
        }
        function _addItem2BasicFieldCheckboxOncheckEnsureExclusiveness(rowIndex) {
            var checkbox = item2BasicFieldRows[rowIndex].querySelector("checkbox");
            checkbox.addEventListener("check", function() {
                if (checkbox.checked) {
                    item1BasicFieldRows[rowIndex].querySelector("checkbox").checked = false;
                }
            });
        }

        function _addItem1BasicFieldCheckboxOncheckUpdateMergeLinkValuesAndIndicators(rowIndex) {
            var checkbox = item1BasicFieldRows[rowIndex].querySelector("checkbox");
            checkbox.addEventListener("check", function() {
                var item1CurrentValueCell = item1BasicFieldRows[rowIndex].querySelector("." + dialog._item1BasicFieldCurrentValueClassName),
                    item1MergedValueCell = item1BasicFieldRows[rowIndex].querySelector("." + dialog._item1BasicFieldMergedValueClassName),
                    item2CurrentValueCell = item2BasicFieldRows[rowIndex].querySelector("." + dialog._item2BasicFieldCurrentValueClassName),
                    item2MergedValueCell = item2BasicFieldRows[rowIndex].querySelector("." + dialog._item2BasicFieldMergedValueClassName);
                var mergedValue, mergedValueDisplay;
                if (checkbox.checked) {
                    mergedValue = item1CurrentValueCell.getAttribute("value");
                    mergedValueDisplay = item1CurrentValueCell.getAttribute("label");
                    dialog._setElementValue(item1MergedValueCell, mergedValue, mergedValueDisplay);
                    dialog._unsetIndicators(item1MergedValueCell);
                    dialog._setElementValue(item2MergedValueCell, mergedValue, mergedValueDisplay);
                    dialog._unsetIndicators(item2MergedValueCell);
                    if (item2MergedValueCell.getAttribute("value") !== item2CurrentValueCell.getAttribute("value")) {
                        dialog._setValueChangeAfterMergeIndicator(item2MergedValueCell);
                    }
                } else {
                    // now both checkboxes are unchecked
                    dialog._unsetIndicators(item1MergedValueCell);
                    dialog._setFieldNotLinkedIndicator(item1MergedValueCell);

                    mergedValue = item2CurrentValueCell.getAttribute("value");
                    mergedValueDisplay = item2CurrentValueCell.getAttribute("label");
                    dialog._setElementValue(item2MergedValueCell, mergedValue, mergedValueDisplay);
                    dialog._unsetIndicators(item2MergedValueCell);
                    dialog._setFieldNotLinkedIndicator(item2MergedValueCell);
                }
            });
        }
        function _addItem2BasicFieldCheckboxOncheckUpdateMergeLinkValuesAndIndicators(rowIndex) {
            var checkbox = item2BasicFieldRows[rowIndex].querySelector("checkbox");
            checkbox.addEventListener("check", function() {
                var item1CurrentValueCell = item1BasicFieldRows[rowIndex].querySelector("." + dialog._item1BasicFieldCurrentValueClassName),
                    item1MergedValueCell = item1BasicFieldRows[rowIndex].querySelector("." + dialog._item1BasicFieldMergedValueClassName),
                    item2CurrentValueCell = item2BasicFieldRows[rowIndex].querySelector("." + dialog._item2BasicFieldCurrentValueClassName),
                    item2MergedValueCell = item2BasicFieldRows[rowIndex].querySelector("." + dialog._item2BasicFieldMergedValueClassName);
                var mergedValue, mergedValueDisplay;
                if (checkbox.checked) {
                    mergedValue = item2CurrentValueCell.getAttribute("value");
                    mergedValueDisplay = item2CurrentValueCell.getAttribute("label");
                    dialog._setElementValue(item2MergedValueCell, mergedValue, mergedValueDisplay);
                    dialog._unsetIndicators(item2MergedValueCell);
                    dialog._setElementValue(item1MergedValueCell, mergedValue, mergedValueDisplay);
                    dialog._unsetIndicators(item1MergedValueCell);
                    if (item1MergedValueCell.getAttribute("value") !== item1CurrentValueCell.getAttribute("value")) {
                        dialog._setValueChangeAfterMergeIndicator(item1MergedValueCell);
                    }
                } else {
                    // now both checkboxes are unchecked
                    dialog._unsetIndicators(item2MergedValueCell);
                    dialog._setFieldNotLinkedIndicator(item2MergedValueCell);

                    mergedValue = item1CurrentValueCell.getAttribute("value");
                    mergedValueDisplay = item1CurrentValueCell.getAttribute("label");
                    dialog._setElementValue(item1MergedValueCell, mergedValue, mergedValueDisplay);
                    dialog._unsetIndicators(item1MergedValueCell);
                    dialog._setFieldNotLinkedIndicator(item1MergedValueCell);
                }
            });
        }

        var i;

        // click of basic field checkboxes
        // ensure the same field of both items cannot be both checked
        // merge/link indicators (text color, font style etc.)
        for (i = 0; i < item1BasicFieldRows.length; i++) {
            _addItem1BasicFieldRowOnclick(i);
            _addItem1BasicFieldCheckboxOncheckEnsureExclusiveness(i);
            _addItem1BasicFieldCheckboxOncheckUpdateMergeLinkValuesAndIndicators(i);
        }
        for (i = 0; i < item2BasicFieldRows.length; i++) {
            _addItem2BasicFieldRowOnclick(i);
            _addItem2BasicFieldCheckboxOncheckEnsureExclusiveness(i);
            _addItem2BasicFieldCheckboxOncheckUpdateMergeLinkValuesAndIndicators(i);
        }

        // sync basic field listboxes scroll locations
        dialog._item1BasicFieldsListbox.addEventListener("scroll", function() {
            dialog._item2BasicFieldsListbox.scrollToIndex(dialog._item1BasicFieldsListbox.getIndexOfFirstVisibleRow());
        });
        dialog._item2BasicFieldsListbox.addEventListener("scroll", function() {
            dialog._item1BasicFieldsListbox.scrollToIndex(dialog._item2BasicFieldsListbox.getIndexOfFirstVisibleRow());
        });
    }

    function _setValueChangeAfterMergeIndicator(listcell) {
        listcell.style.color = "red";
        listcell.style.fontStyle = "italic";
    }
    function _setFieldNotLinkedIndicator(listcell) {
        listcell.style.color = "gray";
        // listcell.style.textDecoration = "line-through";
    }
    function _unsetIndicators(listcell) {
        listcell.removeAttribute("style");
    }
};
