function log(msg) {
    if (ZOTLINK_SETTINGS.DEBUG) console.log(msg);
}

function confirm(title, msg) {
    return Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                     .getService(Components.interfaces.nsIPromptService)
                     .confirm(null, title, msg);
}

function alert(title, msg) {
    Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
              .getService(Components.interfaces.nsIPromptService)
              .alert(null, title, msg);
}

function dialog(name, params, io, nameAsURL) {
    var url = nameAsURL ? name : "chrome://zotlink/content/dialogs/" + name + ".xul";
    window.openDialog(url, "", params, io);
}
