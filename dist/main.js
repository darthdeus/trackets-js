goog.provide("trackets.ajax");
function sendRequest(url, postData) {
  var req = createXMLHTTPObject();
  if(!req) {
    return
  }
  req.open("POST", url, true);
  req.setRequestHeader("Content-type", "application/json");
  req.send(postData);
  req.onreadystatechange = function(e) {
    if(req.readyState == 4) {
      if(req.status != 200 && req.status != 201) {
        Trackets.queue.push([url, postData]);
        console.log("Trackets failed to deliver the error report data. Retrying in 20 seconds.")
      }
    }
  }
}
var XMLHttpFactories = [function() {
  return new XMLHttpRequest
}, function() {
  return new ActiveXObject("Msxml2.XMLHTTP")
}, function() {
  return new ActiveXObject("Msxml3.XMLHTTP")
}, function() {
  return new ActiveXObject("Microsoft.XMLHTTP")
}];
function createXMLHTTPObject() {
  var xmlhttp = false;
  for(var i = 0;i < XMLHttpFactories.length;i++) {
    try {
      xmlhttp = XMLHttpFactories[i]()
    }catch(e) {
      continue
    }
    break
  }
  return xmlhttp
}
;goog.provide("trackets.guid");
function GuidGenerator(key) {
  this.key = key;
  function s4() {
    return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1)
  }
  this.generateGuid = function() {
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4()
  };
  this.assignGuid = function() {
    if(window.localStorage) {
      var guid = window.localStorage.getItem(key);
      if(!guid) {
        guid = this.generateGuid();
        window.localStorage.setItem(key, guid)
      }
      return guid
    }
  };
  this.clearGuid = function() {
    window.localStorage.removeItem(key)
  }
}
;goog.provide("trackets.queue");
function Queue(interval, key) {
  this.key = key;
  this.interval = interval || 5E3;
  if(typeof this.key === "undefined") {
    this.q = []
  }else {
    this.q = JSON.parse(window.localStorage.getItem(key)) || []
  }
  this.push = function(item) {
    this.q.push(item);
    if(typeof this.key !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(this.q))
    }
  };
  this.pop = function() {
    return this.q.pop()
  };
  var self = this;
  var stream = new Stream;
  stream.subscribe(function() {
    if(typeof self.worker === "function") {
      if(self.q.length > 0) {
        self.worker.call(self, self.q.pop())
      }
    }
  });
  this.tick = function() {
    stream.push("tick")
  };
  this.start = function() {
    self.intervalId = setInterval(function() {
      stream.push("tick")
    }, self.interval)
  };
  this.stop = function() {
    clearInterval(self.intervalId)
  }
}
;goog.provide("trackets.stack");
var CHROME_REGEX = / *at (\S+) \((.+?):(\d+):(\d+)\)/;
var CHROME_ANONYMOUS_REGEX = / * at (\<anonymous\>)():(\d+):(\d+)/;
var PHANTOM_REGEX = /()  *at (\S+):(\d+)/;
var PHANTOM_REGEX_ALT = /()  *at process \((\S+):(\d+)\)/;
var SAFARI_REGEX = / *(\w+@)?(.+):(\d+):(\d+)/;
var FIREFOX_REGEX = / *(\w?)@(.+):(\d+)/;
var PARSERS = [CHROME_ANONYMOUS_REGEX, CHROME_REGEX, SAFARI_REGEX, FIREFOX_REGEX, PHANTOM_REGEX, PHANTOM_REGEX_ALT];
function matchStackLine(line) {
  var match;
  for(var i = 0;i < PARSERS.length;i++) {
    if(match = line.match(PARSERS[i])) {
      return match
    }
  }
  return null
}
function parseStack(stack) {
  var lines = stack.split("\n");
  var results = [];
  for(var i = 0;i < lines.length;i++) {
    var match = matchStackLine(lines[i]);
    if(match) {
      var column = match[4];
      var function_name = match[1];
      if(!column) {
        column = undefined
      }
      if(!function_name) {
        function_name = undefined
      }else {
        function_name = function_name.replace(new RegExp("@$"), "")
      }
      results.push({"function":function_name, "file":match[2], "line":match[3], "column":column})
    }
  }
  return results
}
function joinParsedStack(lines) {
  var results = [];
  for(var i = 0;i < lines.length;i++) {
    var line = lines[i];
    var joinedLine = line["function"];
    if(line["file"]) {
      joinedLine += " at " + line["file"]
    }
    joinedLine += ":" + line["line"];
    if(line["column"]) {
      joinedLine += ":" + line["column"]
    }
    results.push(joinedLine)
  }
  return results.join("\n")
}
function normalizeStack(stack) {
  if(stack) {
    return joinParsedStack(parseStack(stack))
  }
}
function expandError(error) {
  var stack = parseStack(error.stack);
  if(stack[0]) {
    return{file:stack[0].file, line:stack[0].line, column:stack[0].column || error.columnNumber, message:error.message, stack:error.stack}
  }else {
    return{}
  }
}
;goog.provide("trackets.stream");
function Stream() {
  this.subscribers = [];
  this.push = function(value) {
    for(var i = 0, l = this.subscribers.length;i < l;i++) {
      var f = this.subscribers[i];
      f.call(this, value)
    }
  };
  this.subscribe = function(f) {
    this.subscribers.push(f)
  }
}
;goog.provide("trackets.wrapper");
function wrap(f, handler, context) {
  if(f.isWrapped) {
    return f
  }
  var wrappedFunction = function() {
    try {
      if(typeof f == "string") {
        f = new Function(f)
      }
      return f.apply(this, arguments)
    }catch(e) {
      if(typeof handler === "function") {
        handler.call(context || this, e)
      }else {
        throw e;
      }
    }
  };
  wrappedFunction.isWrapped = true;
  return wrappedFunction
}
function isNative(f) {
  return f && /native code/.test(f.toString())
}
function wrapListenerHandlers(object, handler) {
  var originalAdd = object.addEventListener, originalRemove = object.removeEventListener;
  object.addEventListener = function(type, listener, useCapture) {
    originalRemove.call(this, type, listener, useCapture);
    return originalAdd.call(this, type, wrap(listener, handler), useCapture)
  };
  object.removeEventListener = function(type, listener, useCapture) {
    originalRemove.call(this, type, listener, useCapture);
    return originalRemove.call(this, type, wrap(listener, handler), useCapture)
  }
}
function wrapObject(object, handler, fields, context) {
  for(key in object) {
    if(object.hasOwnProperty(key)) {
      var val = object[key];
      if(typeof val === "function") {
        if(typeof fields === "undefined" || (fields.length === 0 || fields.indexOf(val.name || key) != -1)) {
          object[key] = wrap(val, handler, context)
        }
      }
    }
  }
}
function wrapTimeout(object, handler) {
  var oldTimeout = object.setTimeout, oldInterval = object.setInterval;
  object.setTimeout = function(f, timeout) {
    return oldTimeout(wrap(f, handler), timeout)
  };
  object.setInterval = function(f, timeout) {
    return oldInterval(wrap(f, handler), timeout)
  }
}
function wrapEventHandlers(handler) {
  if(document.addEventListener) {
    wrapListenerHandlers(document, handler);
    wrapListenerHandlers(window, handler);
    wrapListenerHandlers(Element.prototype, handler);
    if(isNative(HTMLButtonElement.prototype.addEventListener)) {
      var ELEMENT_NAMES = ["HTMLAnchorElement", "HTMLAppletElement", "HTMLAreaElement", "HTMLBaseElement", "HTMLBaseFontElement", "HTMLBlockquoteElement", "HTMLBodyElement", "HTMLBRElement", "HTMLButtonElement", "HTMLDirectoryElement", "HTMLDivElement", "HTMLDListElement", "HTMLFieldSetElement", "HTMLFontElement", "HTMLFormElement", "HTMLFrameElement", "HTMLFrameSetElement", "HTMLHeadElement", "HTMLHeadingElement", "HTMLHRElement", "HTMLHtmlElement", "HTMLIFrameElement", "HTMLImageElement", "HTMLInputElement", 
      "HTMLIsIndexElement", "HTMLLabelElement", "HTMLLayerElement", "HTMLLegendElement", "HTMLLIElement", "HTMLLinkElement", "HTMLMapElement", "HTMLMenuElement", "HTMLMetaElement", "HTMLModElement", "HTMLObjectElement", "HTMLOListElement", "HTMLOptGroupElement", "HTMLOptionElement", "HTMLParagraphElement", "HTMLParamElement", "HTMLPreElement", "HTMLQuoteElement", "HTMLScriptElement", "HTMLSelectElement", "HTMLStyleElement", "HTMLTableCaptionElement", "HTMLTableCellElement", "HTMLTableColElement", 
      "HTMLTableElement", "HTMLTableRowElement", "HTMLTableSectionElement", "HTMLTextAreaElement", "HTMLTitleElement", "HTMLUListElement"];
      for(var i = 0;i < ELEMENT_NAMES.length;i++) {
        var name = ELEMENT_NAMES[i];
        if(window[name]) {
          wrapListenerHandlers(window[name].prototype, handler)
        }
      }
    }
  }
}
function wrapAll(handler, errorHandler) {
  wrapTimeout(window, handler);
  document.addEventListener("DOMContentLoaded", function() {
    wrapEventHandlers(handler)
  });
  window.onerror = errorHandler
}
;if(typeof goog === "undefined") {
  goog = {require:function() {
  }}
}
goog.provide("trackets.main");
goog.require("trackets.guid");
goog.require("trackets.queue");
goog.require("trackets.stack");
goog.require("trackets.stream");
goog.require("trackets.wrapper");
goog.require("trackets.ajax");
var TRACKETS_LOCALSTORAGE_KEY = "__trackets_localstorage_guid";
window["Trackets"] = {"init":function(options) {
  if(this.__init_done) {
    return
  }
  options = options || {};
  this.throwIfMissing(options["api_key"], "api_key is required.");
  this.guid = (new GuidGenerator(TRACKETS_LOCALSTORAGE_KEY)).assignGuid();
  this.api_key = options["api_key"];
  this.custom_data = options["custom_data"] || {};
  this.callback = options["callback"];
  this.tick = options["tick"];
  this.eventLog = [];
  document.addEventListener("click", this.eventHandler(this));
  if(options["api_base_url"] || (window.__TRACKETS_DEBUG_MODE || options["debug_mode"])) {
    this.debug_mode = true;
    this.log("You're running Trackets in development mode. Define `window.__trackets_mock_send_request` to override error reports to production API.")
  }
  this.pageLoadTimestamp = +new Date;
  this.api_base_url = options["api_base_url"] || "http://beta.trackets.com";
  this.report_url = this.api_base_url + "/reports";
  this.log("Initialized Trackets with API key:", this.api_key);
  wrapAll(this.storeErrorObject, this.onErrorHandler);
  this.queue = new Queue(this.tick || 2E3);
  this.queue.worker = this.workerTick(this);
  this.queue.start();
  this.__init_done = true
}, storeErrorObject:function(e) {
  window.__trackets_last_error = e;
  throw e;
}, forceTick:function() {
  this.queue.tick()
}, workerTick:function(self) {
  return function(item) {
    if(typeof window.__trackets_mock_send_request === "function") {
      window.__trackets_mock_send_request(self.report_url, JSON.parse(item[1]))
    }else {
      if(typeof navigator.onLine === "boolean") {
        if(navigator.onLine) {
          sendRequest.apply(self, item)
        }else {
          Trackets.log("User offline, delaying error request")
        }
      }else {
        sendRequest.apply(self, item)
      }
    }
  }
}, log:function() {
  if(this.debug_mode && (console && console.log)) {
    console.log.apply(console, arguments)
  }
}, eventHandler:function(context) {
  return function(event) {
    context.eventLog.push({"type":"event-click", "html":event.target.outerHTML, "timestamp":+new Date})
  }
}, serialize:function(message, fileName, lineNumber, columnNumber, stack) {
  var data = {"api_key":this.api_key, "error":{"message":message, "file_name":fileName, "line_number":lineNumber, "column_number":columnNumber, "url":document.location.href, "user_agent":navigator.userAgent, "stacktrace":normalizeStack(stack), "custom_data":this.custom_data, "guid":this.guid, "event_log":this.eventLog, "timestamp":(new Date).getTime(), "page_load_timestamp":this.pageLoadTimestamp}};
  if(this.callback) {
    this.callback.call(this, data.error)
  }
  return data
}, "notify":function(message, filename, lineNumber, stack) {
  this.throwIfMissing(this.api_key, "api_key is required");
  if(typeof message === "object") {
    var expanded = expandError(message);
    var message = expanded.message, filename = expanded.file, lineNumber = expanded.line, columnNumber = expanded.column, stack = expanded.stack
  }
  data = this.serialize(message, filename, lineNumber, columnNumber, stack);
  this.queue.push([this.report_url, JSON.stringify(data)]);
  this.forceTick()
}, "guard":function(f, context) {
  try {
    if(typeof context === "undefined") {
      f.call(window)
    }else {
      f.apply(context, Array.prototype.slice.call(arguments, 2))
    }
  }catch(e) {
    window["Trackets"]["notify"](e)
  }
}, "guardObject":function(object, fields) {
  wrapObject(object, window["Trackets"]["notify"], fields, window["Trackets"])
}, throwIfMissing:function(condition, message) {
  if(!condition) {
    throw new Error("Assertion Error: " + message);
  }
}, onErrorHandler:function(message, fileName, lineNumber) {
  var actualMessage = window.__trackets_last_error && window.__trackets_last_error.message || message;
  window["Trackets"]["notify"](actualMessage, fileName, lineNumber, window.__trackets_last_error && window.__trackets_last_error.stack)
}};
function contentLoaded(win, fn) {
  var done = false, top = true, doc = win.document, root = doc.documentElement, add = doc.addEventListener ? "addEventListener" : "attachEvent", rem = doc.addEventListener ? "removeEventListener" : "detachEvent", pre = doc.addEventListener ? "" : "on", init = function(e) {
    if(e.type == "readystatechange" && doc.readyState != "complete") {
      return
    }
    (e.type == "load" ? win : doc)[rem](pre + e.type, init, false);
    if(!done && (done = true)) {
      fn.call(win, e.type || e)
    }
  }, poll = function() {
    try {
      root.doScroll("left")
    }catch(e) {
      setTimeout(poll, 50);
      return
    }
    init("poll")
  };
  if(doc.readyState == "complete") {
    fn.call(win, "lazy")
  }else {
    if(doc.createEventObject && root.doScroll) {
      try {
        top = !win.frameElement
      }catch(e) {
      }
      if(top) {
        poll()
      }
    }
    doc[add](pre + "DOMContentLoaded", init, false);
    doc[add](pre + "readystatechange", init, false);
    win[add](pre + "load", init, false)
  }
}
var script = document.querySelector("[data-trackets-key]") || document.querySelector("[data-trackets-customer]");
var attr;
if(script) {
  if(attr = script.attributes["data-trackets-customer"] || script.attributes["data-trackets-key"]) {
    var t = window["Trackets"];
    t["init"].call(t, {"api_key":attr.value})
  }
}
;
