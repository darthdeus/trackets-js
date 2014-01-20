goog.provide("trackets.wrapper");

function wrap(f, handler) {
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

function isNative(f) {
  return f && /native code/.test(f.toString());
}

function wrapListenerHandlers(object, handler) {
  var originalAdd = object.addEventListener,
      originalRemove = object.removeEventListener;

  object.addEventListener = function(type, listener, useCapture) {
    originalRemove.call(this, type, listener, useCapture);
    return originalAdd.call(this, type, wrap(listener, handler), useCapture);
  };

  object.removeEventListener = function(type, listener, useCapture) {
    originalRemove.call(this, type, listener, useCapture);
    return originalRemove.call(this, type, wrap(listener, handler), useCapture);
  };
}

function wrapTimeout(object, handler) {
  var oldTimeout = object.setTimeout,
      oldInterval = object.setInterval;

  object.setTimeout = function(f, timeout) {
    return oldTimeout(wrap(f, handler), timeout);
  };

  object.setInterval = function(f, timeout) {
    return oldInterval(wrap(f, handler), timeout);
  };
}

function wrapEventHandlers(handler) {
  if (document.addEventListener) {
    wrapListenerHandlers(document, handler);
    wrapListenerHandlers(window, handler);
    wrapListenerHandlers(Element.prototype, handler);

    if (isNative(HTMLButtonElement.prototype.addEventListener)) {
      var ELEMENT_NAMES = ["HTMLAnchorElement", "HTMLAppletElement", "HTMLAreaElement", "HTMLBaseElement", "HTMLBaseFontElement", "HTMLBlockquoteElement", "HTMLBodyElement", "HTMLBRElement", "HTMLButtonElement", "HTMLDirectoryElement", "HTMLDivElement", "HTMLDListElement", "HTMLFieldSetElement", "HTMLFontElement", "HTMLFormElement", "HTMLFrameElement", "HTMLFrameSetElement", "HTMLHeadElement", "HTMLHeadingElement", "HTMLHRElement", "HTMLHtmlElement", "HTMLIFrameElement", "HTMLImageElement", "HTMLInputElement", "HTMLIsIndexElement", "HTMLLabelElement", "HTMLLayerElement", "HTMLLegendElement", "HTMLLIElement", "HTMLLinkElement", "HTMLMapElement", "HTMLMenuElement", "HTMLMetaElement", "HTMLModElement", "HTMLObjectElement", "HTMLOListElement", "HTMLOptGroupElement", "HTMLOptionElement", "HTMLParagraphElement", "HTMLParamElement", "HTMLPreElement", "HTMLQuoteElement", "HTMLScriptElement", "HTMLSelectElement", "HTMLStyleElement", "HTMLTableCaptionElement", "HTMLTableCellElement", "HTMLTableColElement", "HTMLTableElement", "HTMLTableRowElement", "HTMLTableSectionElement", "HTMLTextAreaElement", "HTMLTitleElement", "HTMLUListElement"];
      for (var i = 0; i < ELEMENT_NAMES.length; i++) {
        var name = ELEMENT_NAMES[i];
        if (window[name]) {
          wrapListenerHandlers(window[name].prototype, handler);
        }
      }
    }
  }
}

function wrapAll(handler, errorHandler) {
  wrapTimeout(window, handler);
  document.addEventListener("DOMContentLoaded", function() { wrapEventHandlers(handler); });
  window.onerror = errorHandler;
}
