const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Home.jsm");
Cu.import("resource://gre/modules/HomeProvider.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const PANEL_ID = "com.margaretleibovic.pocket";
const DATASET_ID = "com.margaretleibovic.pocket.items";

XPCOMUtils.defineLazyGetter(this, "Pocket", function() {
  let win = Services.wm.getMostRecentWindow("navigator:browser");
  Services.scriptloader.loadSubScript("chrome://pocketpanel/content/pocket.js", win);
  return win.Pocket;
});

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
        url: "about:reader?url=" + encodeURIComponent(item.resolved_url)
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

var gMenuId;

// Add a menu-item as a hack to force update data.
function addMenuItem(window) {
  gMenuId = window.NativeWindow.menu.add({
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

function removeMenuItem(window) {
  window.NativeWindow.menu.remove(gMenuId);
}

/**
 * bootstrap.js API
 */
var windowListener = {
  // Wait for the window to finish loading
  onOpenWindow: function(aWindow) {
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      addMenuItem(domWindow);
    }, false);
  },
  onCloseWindow: function(aWindow) {},
  onWindowTitleChange: function(aWindow, aTitle) {}
};

function startup(aData, aReason) {
  // Load menu item into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    addMenuItem(domWindow);
  }

  // Use a window listener to add a menu item to any new windows.
  Services.wm.addListener(windowListener);

  // Callback function that generates panel configuation
  function optionsCallback() {
    return {
      title: "Pocket",
      views: [{
        type: Home.panels.View.LIST,
        dataset: DATASET_ID
      }],
      authHandler: {
        authenticate: function authenticate() {
          Pocket.authenticate(function() {
            Home.panels.setAuthenticated(PANEL_ID, true);
            updateData(openPocketPanel);
          });
        },
        messageText: "Please log in to Pocket",
        buttonText: "Log in"
      }
    };
  }

  // Always register a panel and a periodic sync listener.
  Home.panels.register(PANEL_ID, optionsCallback);

  HomeProvider.addPeriodicSync(DATASET_ID, 3600, updateData);

  switch(aReason) {
    case ADDON_ENABLE:
    case ADDON_INSTALL:
      Home.panels.install(PANEL_ID);

      // Fetch items for the first time.
      Pocket.authenticate(() => updateData(openPocketPanel));
      break;

    case ADDON_UPGRADE:
    case ADDON_DOWNGRADE:
      Home.panels.update(PANEL_ID);
      break;
  }
}

function shutdown(aData, aReason) {
  if (aReason == ADDON_UNINSTALL || aReason == ADDON_DISABLE) {
    deleteItems();
    Home.panels.uninstall(PANEL_ID);
    try {
      Home.panels.setAuthenticated(PANEL_ID, false);
    } catch (e) {}
    Pocket.clearAccessToken();
  }

  Home.panels.unregister(PANEL_ID);

  // Remove menu item from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    removeMenuItem(domWindow);
  }

  // Stop listening for new windows
  Services.wm.removeListener(windowListener);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
