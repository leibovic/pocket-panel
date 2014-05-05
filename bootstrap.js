const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Home.jsm");
Cu.import("resource://gre/modules/HomeProvider.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "Pocket", function() {
  let win = Services.wm.getMostRecentWindow("navigator:browser");
  Services.scriptloader.loadSubScript("chrome://pocketpanel/content/pocket.js", win);
  return win.Pocket;
});

XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://pocketpanel/locale/pocket.properties");
});

XPCOMUtils.defineLazyGetter(this, "Reader", function() {
  return Services.wm.getMostRecentWindow("navigator:browser").Reader;
});

// Unique IDs for panel and dataset.
const PANEL_ID = "pocket.panel@margaretleibovic.com";
const DATASET_ID = "pocket.dataset@margaretleibovic.com";

function optionsCallback() {
  return {
    title: Strings.GetStringFromName("panel.title"),
    views: [{
      type: Home.panels.View.LIST,
      dataset: DATASET_ID,
      onrefresh: function onrefresh() {
        if (!Pocket.isAuthenticated) {
          Pocket.authenticate(() => refreshDataset());
        } else {
          refreshDataset();
        }
      }
    }],
    /* Authentication UI currently broken because of bug 997328
    auth: {
      authenticate: function authenticate() {
        Pocket.authenticate(function() {
          Home.panels.setAuthenticated(PANEL_ID, true);
          refreshDataset(openPocketPanel);
        });
      },
      messageText: Strings.GetStringFromName("auth.message"),
      buttonText: Strings.GetStringFromName("auth.button")
    }
    */
  };
}

function openPocketPanel() {
  Services.wm.getMostRecentWindow("navigator:browser").BrowserApp.loadURI("about:home?panel=" + PANEL_ID);
}

function refreshDataset(callback) {
  Pocket.getItems(function(list) {
    let items = [];
    for (let id in list) {
      let item = list[id];

      // Cache the article for offline use
      let url = item.resolved_url;
      Reader.parseDocumentFromURL(url, function (article) {
        if (!article) {
          Cu.reportError("Error parsing Pocket article: " + url);
          return;
        }
        try {
          Reader.storeArticleInCache(article, function (success) {
            if (!success) {
              Cu.reportError("Error caching Pocket article: " + url);
            }
          });
        } catch (e) {
          // storeArticleInCache can throw if the article is already cached
          Cu.reportError("Error caching Pocket article: " + url + ": " + e);
        }
      });

      items.push({
        title: item.resolved_title,
        description: item.excerpt,
        // Open URLs in reader mode
        url: "about:reader?url=" + encodeURIComponent(url)
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
function startup(aData, aReason) {
  // Always register panel on startup.
  Home.panels.register(PANEL_ID, optionsCallback);

  switch(aReason) {
    case ADDON_ENABLE:
    case ADDON_INSTALL:
      Home.panels.install(PANEL_ID);
      Pocket.authenticate(() => refreshDataset(() => openPocketPanel()));
      break;

    case ADDON_UPGRADE:
    case ADDON_DOWNGRADE:
      Home.panels.update(PANEL_ID);
      break;
  }

  // Update data once every hour.
  HomeProvider.addPeriodicSync(DATASET_ID, 3600, refreshDataset);
}

function shutdown(aData, aReason) {
  if (aReason == ADDON_UNINSTALL || aReason == ADDON_DISABLE) {
    Home.panels.uninstall(PANEL_ID);
    deleteItems();

    // Authentication UI currently broken because of bug 997328
    //Home.panels.setAuthenticated(PANEL_ID, false);
    Pocket.clearAccessToken();
  }

  Home.panels.unregister(PANEL_ID);
}

function install(aData, aReason) {}

function uninstall(aData, aReason) {}
