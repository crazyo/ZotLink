// only create main object once
if (!Zotero.ZotLink) {
    var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                           .getService(Components.interfaces.mozIJSSubScriptLoader);
    loader.loadSubScript("chrome://zotlink/content/zotlink.js");
}
