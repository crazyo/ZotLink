var _load = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                      .getService(Components.interfaces.mozIJSSubScriptLoader)
                      .loadSubScript;
var _import = Components.utils.import;

/************************************************/

// load settings to global scope
_load("chrome://zotlink/content/settings.js");
// load services to global scope
_load("chrome://zotlink/content/services.js");

// only create main object once
if (!Zotero.ZotLink) _load("chrome://zotlink/content/zotlink.js");

window.addEventListener("load", function() { Zotero.ZotLink.init(); });
