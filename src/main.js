if (typeof goog === "undefined") {
  goog = {
    require: function() { }
  }
}

goog.provide("trackets.main");

goog.require("trackets.guid");
goog.require("trackets.queue");
goog.require("trackets.stack");
goog.require("trackets.stream");
goog.require("trackets.wrapper");
goog.require("trackets.ajax");

var TRACKETS_LOCALSTORAGE_KEY = "__trackets_localstorage_guid";

window["Trackets"] = {
  "init": function(options) {
    console.log("init called");
    if (this.__init_done) return; // allow only one init
    console.log("init not skipped");

    options = options || {};
    this.throwIfMissing(options["api_key"], "api_key is required.");

    this.guid = new GuidGenerator(TRACKETS_LOCALSTORAGE_KEY).assignGuid();
    this.api_key = options["api_key"];
    this.custom_data = options["custom_data"] || {};
    this.callback = options["callback"];
    this.tick = options["tick"];

    this.eventLog = [];

    document.addEventListener("click", this.eventHandler(this));

    if (options["api_base_url"] || window.__TRACKETS_DEBUG_MODE || options["debug_mode"]) {
      this.debug_mode = true;
      this.log("You're running Trackets in development mode. Define `window.__trackets_mock_send_request` to override error reports to production API.");
    }

    this.api_base_url = options["api_base_url"] || "http://beta.trackets.com";
    this.report_url = this.api_base_url + "/reports";

    this.log("Initialized Trackets with API key:", this.api_key);

    wrapAll(this.storeErrorObject, this.onErrorHandler);

    // TODO - add localstorage key
    this.queue = new Queue(this.tick || 2000);
    this.queue.worker = this.workerTick(this);
    this.queue.start();

    this.__init_done = true;
  },

  /*
   * Error objects in try/catch are stored and rethrown, in order to capture
   * the filename and a line number along with the stacktrace. The stored error
   * is then handled by window.onerror callback.
   */
  storeErrorObject: function(e) {
    window.__trackets_last_error = e;
    throw e;
  },

  forceTick: function() {
    // console.group("Force tick");
    this.queue.tick();
    // console.groupEnd();
  },

  workerTick: function(self) {
    return function(item) {
      // In order to easily test trackets client integration a global window.__trackets_mock_send_request
      // function can be defined, in which case it is used instead of sending data to the server.
      if (typeof window.__trackets_mock_send_request === "function") {
        window.__trackets_mock_send_request(self.report_url, JSON.parse(item[1]));
      } else {
        sendRequest.apply(self, item);
      }
    };
  },

  log: function() {
    if (this.debug_mode && console && console.log) {
      console.log.apply(console, arguments);
    }
  },

  eventHandler: function(context) {
    return function(event) {
      context.eventLog.push({
        "type": "event-click",
        "html": event.target.outerHTML,
        "timestamp": +new Date()
      });
    };
  },

  /**
    Serialize all browser data about the client session
    into a single data object.
    */
  serialize: function(message, fileName, lineNumber, stack) {
    var data = {
      "api_key": this.api_key,
      "error": {
        "message": message,
        "file_name": fileName,
        "line_number": lineNumber,
        "url": document.location.href,
        "user_agent": navigator.userAgent,
        "stacktrace": normalizeStack(stack), // TODO - check if this is null sometimes?
        "custom_data": this.custom_data,
        "guid": this.guid,
        "event_log": this.eventLog,
        "timestamp": new Date().getTime()
      }
    };

    if (this.callback) {
      this.callback.call(this, data.error);
    }

    return data;
  },

  "notify": function(message, filename, lineNumber, stack) {
    this.throwIfMissing(this.api_key, "api_key is required");

    data = this.serialize(message, filename, lineNumber, stack);

    this.queue.push([this.report_url, JSON.stringify(data)]);
    this.forceTick();
  },

  throwIfMissing: function(condition, message) {
    if (!condition) {
      throw new Error("Assertion Error: " + message);
    }
  },

  onErrorHandler: function(message, fileName, lineNumber) {
    var actualMessage = (window.__trackets_last_error && window.__trackets_last_error.message) || message;
    window["Trackets"]["notify"](actualMessage, fileName, lineNumber, window.__trackets_last_error && window.__trackets_last_error.stack);
  }
};

// window.__trackets_mock_send_request = function(url, data) {
//   console.group("Error report");
//   console.log("URL:", url);
//   console.log("Stacktrace", data.error.stacktrace);
//   console.log(data.error);
//   console.groupEnd();
// }


/*!
 * contentloaded.js
 *
 * Author: Diego Perini (diego.perini at gmail.com)
 * Summary: cross-browser wrapper for DOMContentLoaded
 * Updated: 20101020
 * License: MIT
 * Version: 1.2
 *
 * URL:
 * http://javascript.nwbox.com/ContentLoaded/
 * http://javascript.nwbox.com/ContentLoaded/MIT-LICENSE
 *
 */

// @win window reference
// @fn function reference
function contentLoaded(win, fn) {
  var done = false, top = true,

  doc = win.document, root = doc.documentElement,

  add = doc.addEventListener ? "addEventListener" : "attachEvent",
  rem = doc.addEventListener ? "removeEventListener" : "detachEvent",
  pre = doc.addEventListener ? "" : "on",

  init = function(e) {
    if (e.type == "readystatechange" && doc.readyState != "complete") return;
    (e.type == "load" ? win : doc)[rem](pre + e.type, init, false);
    if (!done && (done = true)) fn.call(win, e.type || e);
  },

  poll = function() {
    try { root.doScroll("left"); } catch(e) { setTimeout(poll, 50); return; }
    init("poll");
  };

  if (doc.readyState == "complete") fn.call(win, "lazy");
  else {
    if (doc.createEventObject && root.doScroll) {
      try { top = !win.frameElement; } catch(e) { }
      if (top) poll();
    }
    doc[add](pre + "DOMContentLoaded", init, false);
    doc[add](pre + "readystatechange", init, false);
    win[add](pre + "load", init, false);
  }
}

var script = document.querySelector("[data-trackets-customer]");
var attr;

if (script) {
  if (attr = script.attributes["data-trackets-customer"]) {
    var t = window["Trackets"];
    t["init"].call(t, { "api_key": attr.value });
  }
}
