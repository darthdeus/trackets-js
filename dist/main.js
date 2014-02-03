var trackets = {ajax:{}};
function sendRequest(a, b) {
  var c = createXMLHTTPObject();
  c && (c.open("POST", a, !0), c.setRequestHeader("Content-type", "application/json"), c.send(b), c.onreadystatechange = function(d) {
    4 == c.readyState && 200 != c.status && 201 != c.status && (Trackets.queue.push([a, b]), console.log("Trackets failed to deliver the error report data. Retrying in 20 seconds."))
  })
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
  for(var a = !1, b = 0;b < XMLHttpFactories.length;b++) {
    try {
      a = XMLHttpFactories[b]()
    }catch(c) {
      continue
    }
    break
  }
  return a
}
;trackets.guid = {};
function GuidGenerator(a) {
  function b() {
    return Math.floor(65536 * (1 + Math.random())).toString(16).substring(1)
  }
  this.key = a;
  this.generateGuid = function() {
    return b() + b() + "-" + b() + "-" + b() + "-" + b() + "-" + b() + b() + b()
  };
  this.assignGuid = function() {
    if(window.localStorage) {
      var b = window.localStorage.getItem(a);
      b || (b = this.generateGuid(), window.localStorage.setItem(a, b));
      return b
    }
  };
  this.clearGuid = function() {
    window.localStorage.removeItem(a)
  }
}
;trackets.queue = {};
function Queue(a, b) {
  this.key = b;
  this.interval = a || 5E3;
  this.q = "undefined" === typeof this.key ? [] : JSON.parse(window.localStorage.getItem(b)) || [];
  this.push = function(a) {
    this.q.push(a);
    "undefined" !== typeof this.key && window.localStorage.setItem(b, JSON.stringify(this.q))
  };
  this.pop = function() {
    return this.q.pop()
  };
  var c = this, d = new Stream;
  d.subscribe(function() {
    "function" === typeof c.worker && 0 < c.q.length && c.worker.call(c, c.q.pop())
  });
  this.tick = function() {
    d.push("tick")
  };
  this.start = function() {
    c.intervalId = setInterval(function() {
      d.push("tick")
    }, c.interval)
  };
  this.stop = function() {
    clearInterval(c.intervalId)
  }
}
;trackets.stack = {};
var CHROME_REGEX = / *at (\S+) \((.+?):(\d+):(\d+)\)/, SAFARI_REGEX = / *(\w+@)?(.+):(\d+):(\d+)/, FIREFOX_REGEX = / *(\w?)@(.+):(\d+)/, PARSERS = [CHROME_REGEX, SAFARI_REGEX, FIREFOX_REGEX];
function matchStackLine(a) {
  for(var b, c = 0;c < PARSERS.length;c++) {
    if(b = a.match(PARSERS[c])) {
      return b
    }
  }
  return null
}
function parseStack(a) {
  a = a.split("\n");
  for(var b = [], c = 0;c < a.length;c++) {
    var d = matchStackLine(a[c]);
    if(d) {
      var e = d[4], f = d[1];
      e || (e = void 0);
      f = f ? f.replace(/@$/, "") : void 0;
      console.log(f);
      b.push({"function":f, file:d[2], line:d[3], column:e})
    }
  }
  return b
}
function joinParsedStack(a) {
  for(var b = [], c = 0;c < a.length;c++) {
    var d = a[c], e = d["function"] + " at " + d.file + ":" + d.line;
    d.column && (e += ":" + d.column);
    b.push(e)
  }
  return b.join("\n")
}
function normalizeStack(a) {
  if(a) {
    return joinParsedStack(parseStack(a))
  }
}
function expandError(a) {
  var b = parseStack(a.stack);
  return{file:b[0].file, line:b[0].line, column:b[0].column || a.columnNumber, message:a.message, stack:a.stack}
}
;trackets.stream = {};
function Stream() {
  this.subscribers = [];
  this.push = function(a) {
    for(var b = 0, c = this.subscribers.length;b < c;b++) {
      this.subscribers[b].call(this, a)
    }
  };
  this.subscribe = function(a) {
    this.subscribers.push(a)
  }
}
;trackets.wrapper = {};
function wrap(a, b, c) {
  if(a.isWrapped) {
    return a
  }
  var d = function() {
    try {
      return"string" == typeof a && (a = new Function(a)), a.apply(this, arguments)
    }catch(d) {
      if("function" === typeof b) {
        b.call(c || this, d)
      }else {
        throw d;
      }
    }
  };
  d.isWrapped = !0;
  return d
}
function isNative(a) {
  return a && /native code/.test(a.toString())
}
function wrapListenerHandlers(a, b) {
  var c = a.addEventListener, d = a.removeEventListener;
  a.addEventListener = function(a, f, g) {
    d.call(this, a, f, g);
    return c.call(this, a, wrap(f, b), g)
  };
  a.removeEventListener = function(a, c, g) {
    d.call(this, a, c, g);
    return d.call(this, a, wrap(c, b), g)
  }
}
function wrapObject(a, b, c, d) {
  for(key in a) {
    if(a.hasOwnProperty(key)) {
      var e = a[key];
      "function" !== typeof e || "undefined" !== typeof c && 0 !== c.length && -1 == c.indexOf(e.name || key) || (a[key] = wrap(e, b, d))
    }
  }
}
function wrapTimeout(a, b) {
  var c = a.setTimeout, d = a.setInterval;
  a.setTimeout = function(a, d) {
    return c(wrap(a, b), d)
  };
  a.setInterval = function(a, c) {
    return d(wrap(a, b), c)
  }
}
function wrapEventHandlers(a) {
  if(document.addEventListener && (wrapListenerHandlers(document, a), wrapListenerHandlers(window, a), wrapListenerHandlers(Element.prototype, a), isNative(HTMLButtonElement.prototype.addEventListener))) {
    for(var b = "HTMLAnchorElement HTMLAppletElement HTMLAreaElement HTMLBaseElement HTMLBaseFontElement HTMLBlockquoteElement HTMLBodyElement HTMLBRElement HTMLButtonElement HTMLDirectoryElement HTMLDivElement HTMLDListElement HTMLFieldSetElement HTMLFontElement HTMLFormElement HTMLFrameElement HTMLFrameSetElement HTMLHeadElement HTMLHeadingElement HTMLHRElement HTMLHtmlElement HTMLIFrameElement HTMLImageElement HTMLInputElement HTMLIsIndexElement HTMLLabelElement HTMLLayerElement HTMLLegendElement HTMLLIElement HTMLLinkElement HTMLMapElement HTMLMenuElement HTMLMetaElement HTMLModElement HTMLObjectElement HTMLOListElement HTMLOptGroupElement HTMLOptionElement HTMLParagraphElement HTMLParamElement HTMLPreElement HTMLQuoteElement HTMLScriptElement HTMLSelectElement HTMLStyleElement HTMLTableCaptionElement HTMLTableCellElement HTMLTableColElement HTMLTableElement HTMLTableRowElement HTMLTableSectionElement HTMLTextAreaElement HTMLTitleElement HTMLUListElement".split(" "), 
    c = 0;c < b.length;c++) {
      var d = b[c];
      window[d] && wrapListenerHandlers(window[d].prototype, a)
    }
  }
}
function wrapAll(a, b) {
  wrapTimeout(window, a);
  document.addEventListener("DOMContentLoaded", function() {
    wrapEventHandlers(a)
  });
  window.onerror = b
}
;"undefined" === typeof goog && (goog = {require:function() {
}});
trackets.main = {};
var TRACKETS_LOCALSTORAGE_KEY = "__trackets_localstorage_guid";
window.Trackets = {init:function(a) {
  if(!this.__init_done) {
    a = a || {};
    this.throwIfMissing(a.api_key, "api_key is required.");
    this.guid = (new GuidGenerator(TRACKETS_LOCALSTORAGE_KEY)).assignGuid();
    this.api_key = a.api_key;
    this.custom_data = a.custom_data || {};
    this.callback = a.callback;
    this.tick = a.tick;
    this.eventLog = [];
    document.addEventListener("click", this.eventHandler(this));
    if(a.api_base_url || window.__TRACKETS_DEBUG_MODE || a.debug_mode) {
      this.debug_mode = !0, this.log("You're running Trackets in development mode. Define `window.__trackets_mock_send_request` to override error reports to production API.")
    }
    this.pageLoadTimestamp = +new Date;
    this.api_base_url = a.api_base_url || "http://beta.trackets.com";
    this.report_url = this.api_base_url + "/reports";
    this.log("Initialized Trackets with API key:", this.api_key);
    wrapAll(this.storeErrorObject, this.onErrorHandler);
    this.queue = new Queue(this.tick || 2E3);
    this.queue.worker = this.workerTick(this);
    this.queue.start();
    this.__init_done = !0
  }
}, storeErrorObject:function(a) {
  window.__trackets_last_error = a;
  throw a;
}, forceTick:function() {
  this.queue.tick()
}, workerTick:function(a) {
  return function(b) {
    "function" === typeof window.__trackets_mock_send_request ? window.__trackets_mock_send_request(a.report_url, JSON.parse(b[1])) : "boolean" === typeof navigator.onLine ? navigator.onLine ? sendRequest.apply(a, b) : Trackets.log("User offline, delaying error request") : sendRequest.apply(a, b)
  }
}, log:function() {
  this.debug_mode && console && console.log && console.log.apply(console, arguments)
}, eventHandler:function(a) {
  return function(b) {
    a.eventLog.push({type:"event-click", html:b.target.outerHTML, timestamp:+new Date})
  }
}, serialize:function(a, b, c, d, e) {
  a = {api_key:this.api_key, error:{message:a, file_name:b, line_number:c, column_number:d, url:document.location.href, user_agent:navigator.userAgent, stacktrace:normalizeStack(e), custom_data:this.custom_data, guid:this.guid, event_log:this.eventLog, timestamp:(new Date).getTime(), page_load_timestamp:this.pageLoadTimestamp}};
  this.callback && this.callback.call(this, a.error);
  return a
}, notify:function(a, b, c, d) {
  this.throwIfMissing(this.api_key, "api_key is required");
  if("object" === typeof a) {
    d = expandError(a);
    a = d.message;
    b = d.file;
    c = d.line;
    var e = d.column;
    d = d.stack
  }
  data = this.serialize(a, b, c, e, d);
  this.queue.push([this.report_url, JSON.stringify(data)]);
  this.forceTick()
}, guard:function(a, b) {
  try {
    "undefined" === typeof b ? a.call(window) : a.apply(b, Array.prototype.slice.call(arguments, 2))
  }catch(c) {
    window.Trackets.notify(c)
  }
}, guardObject:function(a, b) {
  wrapObject(a, window.Trackets.notify, b, window.Trackets)
}, throwIfMissing:function(a, b) {
  if(!a) {
    throw Error("Assertion Error: " + b);
  }
}, onErrorHandler:function(a, b, c) {
  window.Trackets.notify(window.__trackets_last_error && window.__trackets_last_error.message || a, b, c, window.__trackets_last_error && window.__trackets_last_error.stack)
}};
function contentLoaded(a, b) {
  var c = !1, d = !0, e = a.document, f = e.documentElement, g = e.addEventListener ? "addEventListener" : "attachEvent", m = e.addEventListener ? "removeEventListener" : "detachEvent", k = e.addEventListener ? "" : "on", h = function(d) {
    if("readystatechange" != d.type || "complete" == e.readyState) {
      ("load" == d.type ? a : e)[m](k + d.type, h, !1), !c && (c = !0) && b.call(a, d.type || d)
    }
  }, l = function() {
    try {
      f.doScroll("left")
    }catch(a) {
      setTimeout(l, 50);
      return
    }
    h("poll")
  };
  if("complete" == e.readyState) {
    b.call(a, "lazy")
  }else {
    if(e.createEventObject && f.doScroll) {
      try {
        d = !a.frameElement
      }catch(n) {
      }
      d && l()
    }
    e[g](k + "DOMContentLoaded", h, !1);
    e[g](k + "readystatechange", h, !1);
    a[g](k + "load", h, !1)
  }
}
var script = document.querySelector("[data-trackets-key]") || document.querySelector("[data-trackets-customer]"), attr;
if(script && (attr = script.attributes["data-trackets-customer"])) {
  var t = window.Trackets;
  t.init.call(t, {api_key:attr.value})
}
;
