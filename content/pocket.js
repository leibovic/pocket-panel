// Inspired by https://github.com/einartryggvi/watchpocket/blob/master/js/main.js

const CONSUMER_KEY = "";
const REDIRECT_URI = "about:blank";

var Pocket = {
  // These will be set during authentication.
  _requestToken: "",
  _accessToken: "",

  get isAuthenticated() {
    return !!this._accessToken;
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
        // XXX: save token in a more permanent place
        this._requestToken = response.code;
        this._getAuthorization(callback);
      }
    );
  },

  // https://getpocket.com/developer/docs/v3/retrieve
  getItems: function(callback) {
    this._post(
      "https://getpocket.com/v3/get",
      JSON.stringify({
        consumer_key: CONSUMER_KEY,
        access_token: this._accessToken,
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

  _getAuthorization: function(callback) {
    var authUrl = [
      "https://getpocket.com/auth/authorize?request_token=",
      this._requestToken,
      "&redirect_uri=",
      REDIRECT_URI
    ].join("");
    
    let tab = window.BrowserApp.addTab(authUrl);
    tab.browser.addEventListener("pageshow", evt => {
      // Check to see if we were redirected to the receiver URL.
      let url = tab.browser.contentWindow.location.href;
      if (url == REDIRECT_URI) {
        this._getAccessToken(callback);
        window.BrowserApp.closeTab(tab);
      }
    }, false);
  },

  _getAccessToken: function(callback) {
    this._post(
      "https://getpocket.com/v3/oauth/authorize",
      JSON.stringify({
        consumer_key: CONSUMER_KEY,
        code: this._requestToken
      }),
      response => {
        // XXX: save token in a more permanent place
        this._accessToken = response.access_token;
        if (callback) {
          callback();
        }
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
      Cu.reportError("Pokcet: POST abort - " + url + ": " + req.statusText);
    }, false);

    req.addEventListener("load", evt => {
      if (req.status === 401) {
        this.authenticate(callback);
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
