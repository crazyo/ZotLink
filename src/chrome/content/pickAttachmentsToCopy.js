var ZotLink_Attachments_Picker = new function() {
    // public methods
    this.init = init;
    this.accept = accept;
    this.selectAll = function() { toggleAllSelectStatus(true) };
    this.deselectAll = function() { toggleAllSelectStatus(false) };

    // private methods/properties


    function init() {
        // fill in item information
        var item = window.arguments[0].item;
        document.getElementById("item-name").setAttribute("value", item.getDisplayTitle());
        document.getElementById("item-type").setAttribute("value", Zotero.ItemTypes.getName(item.itemTypeID));

        // fill attachments pool
        var attachments = Zotero.Items.get(item.getAttachments());
        for (var i = 0; i < attachments.length; i++) {
            var attachment = attachments[i];
            var row = document.createElement("listitem");
            row.setAttribute("type", "checkbox");
            row.setAttribute("checked", attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL ? true : false);
            row.setAttribute("label", attachment.getDisplayTitle());
            row.setAttribute("tooltiptext", attachment.getDisplayTitle());
            row.setAttribute("value", attachment.id);
            row.setAttribute("disabled", attachment.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_URL ? false : true);
            document.getElementById("attachments-pool").appendChild(row);
        }
    }

    function accept() {
        var selected = [];
        var all = document.getElementById("attachments-pool").children;
        for (var i = 0; i < all.length; i++) {
            if (all[i].checked) {
                selected.push(all[i].value);
            }
        }
        window.arguments[0].out = selected;
    }

    function toggleAllSelectStatus(selected) {
        var elements = document.getElementById("attachments-pool").children;
        for (var i = 0; i < elements.length; i++) {
            if (!elements[i].disabled) elements[i].setAttribute("checked", selected);
        }
    }
};
