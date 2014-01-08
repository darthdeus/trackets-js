if (typeof goog === "undefined") {
  goog = {
    require: function() { }
  }
}

goog.provide("trackets");

goog.require("guid");
goog.require("queue");
goog.require("stack");
goog.require("stream");
goog.require("wrapper");
goog.require("ajax");

var TRACKETS_LOCALSTORAGE_KEY = "__trackets_localstorage_guid";

window["Trackets"] = {
  "init": function(options) {
    if (this.__init_done) return; // allow only one init

    options = options || {};
    throwIfMissing(options["api_key"], "api_key is required.");

    this.guid = new GuidGenerator(TRACKETS_LOCALSTORAGE_KEY).assignGuid();
    this.api_key = options["api_key"];
    this.custom_data = options["custom_data"] || {};
    this.callback = options["callback"];
    this.tick = options["tick"];

    this.eventLog = [];

    document.body.addEventListener("click", this.eventHandler(this));

    if (options.api_base_url || window.__TRACKETS_DEBUG_MODE || options["debug_mode"]) {
      this.debug_mode = true;
      console.log("You're running Trackets in development mode. Define `window.__trackets_mock_send_request` to override error reports to production API.");
    }

    this.api_base_url = options["api_base_url"] || "http://beta.trackets.com";
    this.report_url = this.api_base_url + "/reports";

    this.log("Initialized Trackets with API key:", this.api_key);

    wrapAll(storeErrorObject);

    // TODO - add localstorage key
    this.queue = new Queue(this.tick || 2000);
    this.queue.worker = this.workerTick(this);
    this.queue.start();

    this.__init_done = true;
  },

  forceTick: function() {
    console.group("Force tick");
    // this.queue.tick();
    console.groupEnd();
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

  notify: function(message, filename, lineNumber, stack) {
    throwIfMissing(this.api_key, "api_key is required");

    data = this.serialize(message, filename, lineNumber, stack);

    this.queue.push([this.report_url, JSON.stringify(data)]);
    this.forceTick();
  }
};

function tracketsOnError(message, fileName, lineNumber) {
  var actualMessage = (window.__trackets_last_error && window.__trackets_last_error.message) || message;
  Trackets.notify(actualMessage, fileName, lineNumber, window.__trackets_last_error && window.__trackets_last_error.stack);
}

/*
 * Error objects in try/catch are stored and rethrown, in order to capture
 * the filename and a line number along with the stacktrace. The stored error
 * is then handled by window.onerror callback.
 */
function storeErrorObject(e) {
  window.__trackets_last_error = e;
  throw e;
}

function isNative(f) {
  return f && /native code/.test(f.toString());
}

function throwIfMissing(condition, message) {
  if (!condition) {
    throw new Error("Assertion Error: " + message);
  }
}

// window.__trackets_mock_send_request = function(url, data) {
//   console.group("Error report");
//   console.log("URL:", url);
//   console.log("Stacktrace", data.error.stacktrace);
//   console.log(data.error);
//   console.groupEnd();
// }
