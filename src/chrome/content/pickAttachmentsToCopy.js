var ZotLink_Attachments_Picker = new function() {
    // public methods
    this.init = init;
    // this.accept = accept;
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
            row.setAttribute("checked", true);
            row.setAttribute("label", attachment.getDisplayTitle());
            row.setAttribute("tooltiptext", attachment.getDisplayTitle());
            document.getElementById("attachments-pool").appendChild(row);
        }
    }

    function toggleAllSelectStatus(selected) {
        var elements = document.getElementById("attachments-pool").children;
        for (var i = 0; i < elements.length; i++) {
            elements[i].setAttribute("checked", selected);
        }
    }
};
