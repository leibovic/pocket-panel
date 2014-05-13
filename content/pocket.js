"use strict";

var Pocket = {
  ACCESS_TOKEN_PREF: "margaretleibovic.pocket.accessToken",
  REDIRECT_URI:  "about:blank",

  get CONSUMER_KEY() {
    if (this._CONSUMER_KEY) {
      return this._CONSUMER_KEY;
    }

    let sandbox = {};
    Services.scriptloader.loadSubScript("chrome://pocketpanel/content/key.js", sandbox);
    this._CONSUMER_KEY = sandbox.CONSUMER_KEY;
    return this._CONSUMER_KEY;
  },

  _accessToken: "",

  get accessToken() {
    if (this._accessToken) {
      return this._accessToken;
    }
    try {
      this._accessToken = Services.prefs.getCharPref(this.ACCESS_TOKEN_PREF);
    } catch (e) {}

    return this._accessToken;
  },

  set accessToken(token) {
    this._accessToken = token;
    Services.prefs.setCharPref(this.ACCESS_TOKEN_PREF, token);
  },

  get isAuthenticated() {
    return !!this.accessToken;
  },

  clearAccessToken: function() {
    Services.prefs.clearUserPref(this.ACCESS_TOKEN_PREF);
    this._accessToken = "";
  },

  // http://getpocket.com/developer/docs/authentication
  authenticate: function(callback) {
    this._post(
      "https://getpocket.com/v3/oauth/request",
      JSON.stringify({
        consumer_key: this.CONSUMER_KEY,
        redirect_uri: this.REDIRECT_URI
      }),
      response => {
        this._getAuthorization(response.code, callback);
      }
    );
  },

  _getAuthorization: function(requestToken, callback) {
    var authUrl = [
      "https://getpocket.com/auth/authorize?request_token=",
      requestToken,
      "&redirect_uri=",
      this.REDIRECT_URI
    ].join("");
    
    let tab = window.BrowserApp.addTab(authUrl);
    tab.browser.addEventListener("pageshow", evt => {
      let url = tab.browser.contentWindow.location.href;
      if (url == this.REDIRECT_URI) {
        this._getAccessToken(requestToken, callback);
        window.BrowserApp.closeTab(tab);
      }
    }, false);
  },

  _getAccessToken: function(requestToken, callback) {
    this._post(
      "https://getpocket.com/v3/oauth/authorize",
      JSON.stringify({
        consumer_key: this.CONSUMER_KEY,
        code: requestToken
      }),
      response => {
        this.accessToken = response.access_token;
        if (callback) {
          callback();
        }
      }
    );
  },

  // https://getpocket.com/developer/docs/v3/retrieve
  getList: function(callback) {
    this._post(
      "https://getpocket.com/v3/get",
      JSON.stringify({
        consumer_key: this.CONSUMER_KEY,
        access_token: this.accessToken,
        contentType: "article",
        sort: "newest",
        count: 20,
        detailType: "simple"
      }),
      response => {
        callback(response.list);
      }
    );
  },

  getHits: function(callback) {
    this.parseFeed("http://getpocket.com/feed/pockethits.rss", (parsedFeed) => {
      callback(this.feedToItems(parsedFeed));
    });
  },

  /**
   * @param callback function takes response JSON as a parameter
   */
  _post: function(url, data, callback) {
    let req = new XMLHttpRequest();
    req.addEventListener("error", evt => {
      Cu.reportError("Pocket: POST error - " + url + ": " + req.statusText);
    }, false);
    req.addEventListener("abort", evt => {
      Cu.reportError("Pocket: POST abort - " + url + ": " + req.statusText);
    }, false);

    req.addEventListener("load", evt => {
      if (req.status === 401) {
        Cu.reportError("Pocket: POST fail - " + url + ": not authenticated");
      } else if (req.status === 200 && callback) {
        let response = JSON.parse(req.responseText);
        callback(response);
      }
    }, false);

    req.open("POST", url);
    req.setRequestHeader("Content-type", "application/json; charset=UTF8");
    req.setRequestHeader("X-Accept", "application/json");
    req.send(data || null);
  },

  // FeedHelper.js

  parseFeed: function(feedUrl, onFinish, onError) {
    let listener = {
      handleResult: function handleResult(feedResult) {
        let feedDoc = feedResult.doc;
        let parsedFeed = feedDoc.QueryInterface(Ci.nsIFeed);
        onFinish(parsedFeed);
      }
    };

    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
    try {
      xhr.open("GET", feedUrl, true);
    } catch (e) {
      Cu.reportError("Error opening request to " + feedUrl + ": " + e);
      if (onError) {
        onError();
      }
      return;
    }
    xhr.overrideMimeType("text/xml");

    xhr.onerror = function onerror(e) {
      Cu.reportError("Error making request to " + feedUrl + ": " + e.error);
      if (onError) {
        onError();
      }
    };

    xhr.onload = function onload(event) {
      if (xhr.status !== 200) {
        Cu.reportError("Request to " + feedUrl + " returned status " + xhr.status);
        if (onError) {
          onError();
        }
        return;
      }

      let processor = Cc["@mozilla.org/feed-processor;1"].createInstance(Ci.nsIFeedProcessor);
      processor.listener = listener;

      let uri = Services.io.newURI(feedUrl, null, null);
      processor.parseFromString(xhr.responseText, uri);
    };

    xhr.send(null);
  },

  feedToItems: function(parsedFeed) {
    let items = [];

    // Create a browser element to create HTML from summary text
    let browser = document.createElement("browser");
    browser.setAttribute("type", "content");
    browser.setAttribute("collapsed", "true");
    browser.setAttribute("disablehistory", "true");
    document.documentElement.appendChild(browser);

    for (let i = 0; i < parsedFeed.items.length; i++) {
      let entry = parsedFeed.items.queryElementAt(i, Ci.nsIFeedEntry);
      entry.QueryInterface(Ci.nsIFeedContainer);
      entry.link.QueryInterface(Ci.nsIURI);

      let item = {
        url: entry.link.spec,
        title: entry.title.plainText()
      };

      if (entry.summary) {
        item.description = entry.summary.plainText();
      } else if (entry.content) {
        item.description = entry.content.plainText();
      } else {
        Cu.reportError("No description found for " + entry.link.spec);
      }

      // Look for an image in the entry
      if (entry.enclosures) {
        for (let j = 0; j < entry.enclosures.length; j++) {
          let enc = entry.enclosures.queryElementAt(j, Ci.nsIWritablePropertyBag2);
          if (enc.hasKey("url") && enc.hasKey("type") && enc.get("type").startsWith("image/")) {
            item.image_url = enc.get("url");
            break;
          }
        }
      }

      // Try to find an image in the summary
      if (!item.image_url) {
        let doc = browser.contentDocument;
        let div = doc.createElement("div");
        div.innerHTML = entry.summary.text;
        let img = div.querySelector("img");
        if (img) {
          item.image_url = img.src;
        }
      }
      items.push(item);
    }

    // Clean up the browser element
    browser.parentNode.removeChild(browser);

    return items;
  }
};
