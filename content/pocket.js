// Inspired by https://github.com/einartryggvi/watchpocket/blob/master/js/main.js

XPCOMUtils.defineLazyGetter(this, "CONSUMER_KEY", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://pocketpanel/content/key.js", sandbox);
  return sandbox.CONSUMER_KEY;
});

const ACCESS_TOKEN_PREF = "margaretleibovic.pocket.accessToken";
const REDIRECT_URI = "about:blank";

var Pocket = {
  _accessToken: "",

  get accessToken() {
    if (this._accessToken) {
      return this._accessToken;
    }
    try {
      this._accessToken = Services.prefs.getCharPref(ACCESS_TOKEN_PREF);
    } catch (e) {}

    return this._accessToken;
  },

  set accessToken(token) {
    this._accessToken = token;
    Services.prefs.setCharPref(ACCESS_TOKEN_PREF, token);
  },

  get isAuthenticated() {
    return !!this._accessToken;
  },

  clearAccessToken: function() {
    Services.prefs.clearUserPref(ACCESS_TOKEN_PREF);
  },

  // http://getpocket.com/developer/docs/authentication
  authenticate: function(callback) {
    this._post(
      "https://getpocket.com/v3/oauth/request",
      JSON.stringify({
        consumer_key: CONSUMER_KEY,
        redirect_uri: REDIRECT_URI
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
      REDIRECT_URI
    ].join("");
    
    let tab = window.BrowserApp.addTab(authUrl);
    tab.browser.addEventListener("pageshow", evt => {
      let url = tab.browser.contentWindow.location.href;
      if (url == REDIRECT_URI) {
        this._getAccessToken(requestToken, callback);
      }
    }, false);
  },

  _getAccessToken: function(requestToken, callback) {
    this._post(
      "https://getpocket.com/v3/oauth/authorize",
      JSON.stringify({
        consumer_key: CONSUMER_KEY,
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
  getItems: function(callback) {
    this._post(
      "https://getpocket.com/v3/get",
      JSON.stringify({
        consumer_key: CONSUMER_KEY,
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
  }
};
