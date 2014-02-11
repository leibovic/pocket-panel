const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Home.jsm");
Cu.import("resource://gre/modules/HomeProvider.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const PANEL_TITLE = "Pocket";
const PANEL_ID = "com.margaretleibovic.pocket";
const DATASET_ID = "com.margaretleibovic.pocket.items";

XPCOMUtils.defineLazyGetter(this, "Pocket", function() {
  let win = Services.wm.getMostRecentWindow("navigator:browser");
  Services.scriptloader.loadSubScript("chrome://pocketpanel/content/pocket.js", win);
  return win.Pocket;
});

var menuId;

function loadIntoWindow(window) {
  menuId = window.NativeWindow.menu.add({
    name: "Update Pocket panel",
    parent: window.NativeWindow.menu.toolsMenuID,
    callback: function() {
      if (!Pocket.isAuthenticated) {
        Pocket.authenticate(() => updateData(openPocketPanel));
      } else {
        updateData(openPocketPanel);
      }
    }
  });
}

function unloadFromWindow(window) {
  window.NativeWindow.menu.remove(menuId);
}

function openPocketPanel() {
  Services.wm.getMostRecentWindow("navigator:browser").BrowserApp.loadURI("about:home?page=" + PANEL_ID);
}

function updateData(callback) {
  Pocket.getItems(function(list) {
    let items = [];
    for (let id in list) {
      let item = list[id];
      items.push({
        title: item.resolved_title,
        description: item.excerpt,
        url: item.resolved_url
      });
    }
    saveItems(items, callback);
  });
}

function saveItems(items, callback) {
  Task.spawn(function() {
    let storage = HomeProvider.getStorage(DATASET_ID);
    yield storage.deleteAll();
    yield storage.save(items);
  }).then(callback, e => Cu.reportError("Error saving Pocket items to HomeProvider: " + e));
}

function deleteItems() {
  Task.spawn(function() {
    let storage = HomeProvider.getStorage(DATASET_ID);
    yield storage.deleteAll();
  }).then(null, e => Cu.reportError("Error deleting Pocket items from HomeProvider: " + e));
}

/**
 * bootstrap.js API
 */
var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      loadIntoWindow(domWindow);
    }, false);
  },
  
  onCloseWindow: function(aWindow) {
  },
  
  onWindowTitleChange: function(aWindow, aTitle) {
  }
};

// BOOTSTRAP_REASONS: http://mxr.mozilla.org/mozilla-central/source/toolkit/mozapps/extensions/XPIProvider.jsm#153
function startup(aData, aReason) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Load into any existing windows
  let windows = wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  wm.addListener(windowListener);

  // Update pocket items once per hour.
  HomeProvider.addPeriodicSync(DATASET_ID, 3600, updateData);

  if (aReason == ADDON_INSTALL || aReason == ADDON_ENABLE) {
    // Fetch items for the first time.
    Pocket.authenticate(() => updateData(openPocketPanel));

    // Add a panel for pocket items.
    Home.panels.add({
      id: PANEL_ID,
      title: PANEL_TITLE,
      layout: Home.panels.Layout.FRAME,
      views: [{
        type: Home.panels.View.LIST,
        dataset: DATASET_ID
      }],
      autoInstall: true
    });
  }
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN) {
    return;
  }

  if (aReason == ADDON_UNINSTALL || aReason == ADDON_DISABLE) {
    deleteItems();
    Home.panels.remove(PANEL_ID);
    Pocket.clearAccessToken();
  }

  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Stop listening for new windows
  wm.removeListener(windowListener);

  // Unload from any existing windows
  let windows = wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}