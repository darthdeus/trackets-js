function Wrapper() {

}

function wrap(f, handler) {
  if (f.isWrapped) {
    return f;
  }

  var wrappedFunction = function() {
    try {
      if (typeof f == "string") {
        f = eval(f);
      }
      return f.apply(this, arguments);
    } catch (e) {
      // If there is no handler we simply re-throw the error
      if (typeof handler === "function") {
        handler(e);
      } else {
        throw e;
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
