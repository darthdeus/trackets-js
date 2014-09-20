if (typeof goog === "undefined") {
  goog = {
    require: function() { }
  }
}

goog.provide("trackets.main");

goog.require("trackets.guid");
goog.require("trackets.queue");
goog.require("trackets.stream");
goog.require("trackets.wrapper");
goog.require("trackets.ajax");
goog.require("trackets.eventLog");
goog.require("trackets.jquery");

var TRACKETS_LOCALSTORAGE_KEY = "__trackets_localstorage_guid";

window["Trackets"] = {
  "init": function(options) {
    // Only one call to init is allowed.
    if (this.__init_done) {
      console.warn("Trackets was initialized twice, please check our user guide http://trackets.com/user_guide");
      return;
    }

    options = options || {};
    this.throwIfMissing(options["api_key"], "api_key is required.");

    this.guid = new GuidGenerator(TRACKETS_LOCALSTORAGE_KEY).assignGuid();
    this.api_key = options["api_key"];
    this["custom_data"] = options["custom_data"] || {};
    this.callback = options["callback"];
    this.tick = options["tick"];

    this.eventLog = new EventLog(100);
    this["pushEvent"]({
      "type": "page-loaded",
      "message": "Page loaded"
    });

    wrapClick(this.eventHandler(this));

    if (options["api_base_url"] || window.__TRACKETS_DEBUG_MODE || options["debug_mode"]) {
      this.debug_mode = true;
      if (typeof window.__trackets_mock_send_request === "function") {
        this.log("You're running Trackest in development mode.");
      } else {
        this.log("You're running Trackets in development mode. Define `window.__trackets_mock_send_request` to override error reports to production API.");
      }
    }

    this.pageLoadTimestamp = +new Date();

    this.api_base_url = options["api_base_url"] || "https://trackets.com";
    this.report_url = this.api_base_url + "/reports/" + this.api_key;

    this.log("Initialized Trackets with API key:", this.api_key);

    wrapAll(this.storeErrorObject, this.onErrorHandler);

    // TODO - add localstorage key
    this.queue = new Queue(this.tick || 2000);
    this.queue.worker = this.workerTick(this);
    this.queue.start();

    this.__init_done = true;
  },

  "initJquery": function() {
    return initJquery(this.onErrorHandler);
  },

  "pushEvent": function(options) {
    this.eventLog.push(options["type"], options["message"], options["level"], options["data"]);
  },

  /*
   * Error objects in try/catch are stored and rethrown, in order to capture
   * the filename and a line number along with the stacktrace. The stored error
   * is then handled by window.onerror callback.
   */
  storeErrorObject: function(e) {
    window["__trackets_last_error"] = e;
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
        if (typeof navigator.onLine === "boolean") {
          if (navigator.onLine) {
            sendRequest.apply(self, item);
          } else {
            Trackets.log("User offline, delaying error request");
          }
        } else {
          sendRequest.apply(self, item);
        }
      }
    };
  },

  log: function() {
    if (this.debug_mode && console && console.log) {
      Function.prototype.apply.call(console.log, console, arguments);
    }
  },

  eventHandler: function(context) {
    return function(event) {
      var elem = event.target || event.srcElement;
      context["pushEvent"]({
        type: "click",
        message: "User clicked",
        level: "info",
        data: { "html": elem.outerHTML.slice(0, 350) }
      });
    };
  },

  /**
    Serialize all browser data about the client session
    into a single data object.
    */
  serialize: function(error) {
    error["url"] = document.location.href;
    error["user_agent"] = navigator.userAgent;
    error["custom_data"] = this["custom_data"];
    error["guid"] = this.guid;
    error["event_log"] = this.eventLog.data;
    error["event_log_length"] = this.eventLog.data.length - 1;
    error["timestamp"] = new Date().getTime();
    error["page_load_timestamp"] = this.pageLoadTimestamp;
    error["language"] = navigator.browserLanguage || navigator.language || navigator.userLanguag;

    var data = {
      "error": error
    };

    if (this.callback) {
      this.callback.call(this, data.error);
    }

    return data;
  },

  "notify": function(message, filename, lineNumber, columnNumber, stack) {
    this.throwIfMissing(this.api_key, "api_key is required");

    var sourceURL;

    if (typeof message === "object") {
      var stack = message.stack,
          columnNumber = message.columnNumber || columnNumber,
          sourceURL = message.sourceURL,
          filename = message.fileName,
          message = message.message;
    }

    var data = this.serialize({
      "message": message,
      "file_name": filename,
      "line_number": lineNumber,
      "column_number": columnNumber,
      "source_url": sourceURL,
      "stacktrace": stack
    });

    this.pushEvent({
      "type": "error",
      "message": message,
      "level": "error"
    });

    this.queue.push([this.report_url, JSON.stringify(data)]);

    this.forceTick();
  },

  "guard": function(f, context) {
    try {
      if (typeof context === "undefined") {
        f.call(window);
      } else {
        f.apply(context, Array.prototype.slice.call(arguments, 2));
      }
    } catch (e) {
      window["Trackets"]["notify"](e);
    }
  },

  "guardObject": function(object, fields) {
    wrapObject(object, window["Trackets"]["notify"], fields, window["Trackets"]);
  },

  throwIfMissing: function(condition, message) {
    if (!condition) {
      throw new Error("Assertion Error: " + message);
    }
  },

  onErrorHandler: function(message, fileName, lineNumber, column, errorObj) {
    var REGEXP = new RegExp("trackets.s3.amazonaws.com/client.js");

    if (REGEXP.test(fileName) || fileName == "http://localhost:9292/dist/main.js") {
      Trackets.log("Ignoring error raised in trackets source code")
    } else {
      var actualMessage = errorObj || (window.__trackets_last_error && window.__trackets_last_error.message) || message;
      window["Trackets"]["notify"](actualMessage, fileName, lineNumber, column, window.__trackets_last_error && window.__trackets_last_error.stack);
    }
  }
};

// window.__trackets_mock_send_request = function(url, data) {
//   console.group("Error report");
//   console.log("URL:", url);
//   console.log("Stacktrace", data.error.stacktrace);
//   console.log(data.error);
//   console.groupEnd();
// }

var script = document.querySelector("[data-trackets-key]") || document.querySelector("[data-trackets-customer]");
var attr;

if (script) {
  if (attr = script.attributes["data-trackets-customer"] || script.attributes["data-trackets-key"]) {
    window["Trackets"]["init"].call(window["Trackets"], { "api_key": attr.value });
  }
}
