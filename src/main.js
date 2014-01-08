window.Trackets = {
  init: function(options) {
    if (this.__init_done) return; // allow only one init

    options = options || {};
    throwIfMissing(options.api_key, "api_key is required.");

    this.guid = assignGuid();
    this.api_key = options.api_key;
    this.custom_data = options.custom_data || {};
    this.callback = options.callback;
    this.tick = options.tick;

    this.eventLog = [];

    document.body.addEventListener("click", this.eventHandler(this));

    if (options.api_base_url || window.__TRACKETS_DEBUG_MODE || options.debug_mode) {
      this.debug_mode = true;
      console.log("You're running Trackets in development mode. Define `window.__trackets_mock_send_request` to override error reports to production API.");
    }

    this.api_base_url = options.api_base_url || "http://beta.trackets.com";
    this.report_url = this.api_base_url + "/reports";

    this.log("Initialized Trackets with API key:", this.api_key);

    wrapAll();

    this.reportQueue = [];

    this.startWorker();
    this.__init_done = true;
  },

  startWorker: function() {
    console.log("START worker");
    this.___worker_interval = setInterval(this.workerTick(this), this.tick || 5000);
  },

  stopWorker: function() {
    console.log("STOP worker");
    clearInterval(this.___worker_interval);
  },

  forceTick: function() {
    console.group("Force tick");
    this.stopWorker();
    this.workerTick(this)();
    this.startWorker();
    console.groupEnd();
  },

  workerTick: function(self) {
    return function() {
      var currentQueue = self.reportQueue;
      self.reportQueue = [];

      while (currentQueue.length > 0) {
        console.log("Working");
        var item = currentQueue.pop();

        // In order to easily test trackets client integration a global window.__trackets_mock_send_request
        // function can be defined, in which case it is used instead of sending data to the server.
        if (typeof window.__trackets_mock_send_request === "function") {
          window.__trackets_mock_send_request(self.report_url, item);
        } else {
          sendRequest.apply(self, item);
        }
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
        type: "event-click",
        html: event.target.outerHTML,
        timestamp: +new Date()
      });
    };
  },

  /**
    Serialize all browser data about the client session
    into a single data object.
    */
  serialize: function(message, fileName, lineNumber, stack) {
    var data = {
      api_key: this.api_key,
      error: {
        message: message,
        file_name: fileName,
        line_number: lineNumber,
        url: document.location.href,
        user_agent: navigator.userAgent,
        stacktrace: normalizeStack(stack), // TODO - check if this is null sometimes?
        custom_data: this.custom_data,
        guid: this.guid,
        event_log: this.eventLog,
        timestamp: new Date().getTime()
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

    this.reportQueue.push([this.report_url, JSON.stringify(data)]);
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
}

function wrap(f) {
  if (f.isWrapped) {
    return f;
  }

  var wrappedFunction = function() {
    try {
      if (typeof f == "string") {
        f = new Function(f);
      }
      return f.apply(this, arguments);
    } catch (e) {
      if (typeof e == "object") {
        storeErrorObject(e);
        throw e; // TODO - this should be conditional based on the user's settings
      } else {
        console.error("INVALID STRING ERROR", e);
        // TODO - implement string error handling
      }
    }
  };

  wrappedFunction.isWrapped = true;

  return wrappedFunction;
}

function wrapListenerHandlers(object) {
  var originalAdd = object.addEventListener,
  originalRemove = object.removeEventListener;

  object.addEventListener = function(type, listener, useCapture) {
    originalRemove.call(this, type, listener, useCapture);
    return originalAdd.call(this, type, wrap(listener), useCapture);
  };

  object.removeEventListener = function(type, listener, useCapture) {
    originalRemove.call(this, type, listener, useCapture);
    return originalRemove.call(this, type, wrap(listener), useCapture);
  };
}

function wrapTimeout() {
  var oldTimeout = window.setTimeout,
  oldInterval = window.setInterval;

  window.setTimeout = function(f, timeout) {
    return oldTimeout(wrap(f), timeout);
  };

  window.setInterval = function(f, timeout) {
    return oldInterval(wrap(f), timeout);
  };
}

function wrapEventHandlers() {
  if (document.addEventListener) {
    wrapListenerHandlers(document);
    wrapListenerHandlers(window);
    wrapListenerHandlers(Element.prototype);

    if (isNative(HTMLButtonElement.prototype.addEventListener)) {
      var ELEMENT_NAMES = ["HTMLAnchorElement", "HTMLAppletElement", "HTMLAreaElement", "HTMLBaseElement", "HTMLBaseFontElement", "HTMLBlockquoteElement", "HTMLBodyElement", "HTMLBRElement", "HTMLButtonElement", "HTMLDirectoryElement", "HTMLDivElement", "HTMLDListElement", "HTMLFieldSetElement", "HTMLFontElement", "HTMLFormElement", "HTMLFrameElement", "HTMLFrameSetElement", "HTMLHeadElement", "HTMLHeadingElement", "HTMLHRElement", "HTMLHtmlElement", "HTMLIFrameElement", "HTMLImageElement", "HTMLInputElement", "HTMLIsIndexElement", "HTMLLabelElement", "HTMLLayerElement", "HTMLLegendElement", "HTMLLIElement", "HTMLLinkElement", "HTMLMapElement", "HTMLMenuElement", "HTMLMetaElement", "HTMLModElement", "HTMLObjectElement", "HTMLOListElement", "HTMLOptGroupElement", "HTMLOptionElement", "HTMLParagraphElement", "HTMLParamElement", "HTMLPreElement", "HTMLQuoteElement", "HTMLScriptElement", "HTMLSelectElement", "HTMLStyleElement", "HTMLTableCaptionElement", "HTMLTableCellElement", "HTMLTableColElement", "HTMLTableElement", "HTMLTableRowElement", "HTMLTableSectionElement", "HTMLTextAreaElement", "HTMLTitleElement", "HTMLUListElement"];
      for (var i = 0; i < ELEMENT_NAMES.length; i++) {
        var name = ELEMENT_NAMES[i];
        if (window[name]) {
          wrapListenerHandlers(window[name].prototype);
        }
      }
    }
  }
}

function wrapAll() {
  wrapTimeout();
  document.addEventListener("DOMContentLoaded", wrapEventHandlers);
  window.onerror = tracketsOnError;
}

function isNative(f) {
  return f && /native code/.test(f.toString());
}

function sendRequest(url, postData) {
  var req = createXMLHTTPObject();
  if (!req) return;

  req.open("POST", url, true);
  req.setRequestHeader("Authorization", "Basic " + btoa("tester:test123"));
  req.setRequestHeader("Content-type", "application/json");

  req.send(postData);

  req.onreadystatechange = function(e) {
    if (req.readyState == 4) {
      if (req.status != 200 && req.status != 201) {
        Trackets.reportQueue.push([url, postData]);
        console.log("Trackets failed to deliver the error report data. Retrying in 20 seconds.");
      }
    }
  }
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
  .toString(16)
  .substring(1);
}

function generateGuid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

var XMLHttpFactories = [
  function () {return new XMLHttpRequest(); },
  function () {return new ActiveXObject("Msxml2.XMLHTTP"); },
  function () {return new ActiveXObject("Msxml3.XMLHTTP"); },
  function () {return new ActiveXObject("Microsoft.XMLHTTP"); }
];

function createXMLHTTPObject() {
  var xmlhttp = false;
  for (var i= 0; i < XMLHttpFactories.length; i++) {
    try {
      xmlhttp = XMLHttpFactories[i]();
    } catch (e) {
      continue;
    }
    break;
  }
  return xmlhttp;
}

function throwIfMissing(condition, message) {
  if (!condition) {
    throw new Error("Assertion Error: " + message);
  }
}

function assignGuid() {
  var TRACKETS_LOCALSTORAGE_KEY = "__trackets_localstorage_guid";
  if (window.localStorage) {
    var guid = window.localStorage.getItem(TRACKETS_LOCALSTORAGE_KEY);

    if (!guid) {
      guid = generateGuid();
      window.localStorage.setItem(TRACKETS_LOCALSTORAGE_KEY, guid);
    }

    return guid;
  }
}
