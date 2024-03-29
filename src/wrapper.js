goog.provide("trackets.wrapper");

function addHandler(name, fn) {
  if(document.addEventListener) document.addEventListener(name, fn);
  else document.attachEvent("on" + name, fn);
}

function wrap(f, handler, context) {
  if (f.isWrapped) {
    return f;
  }

  var wrappedFunction = function() {
    try {
      if (typeof f == "string") {
        f = new Function(f);
      }

      if (typeof f != "function") {
        return f;
      }

      return f.apply(this, arguments);
    } catch (e) {
      // If there is no handler we simply re-throw the error
      if (typeof handler === "function") {
        handler.call(context || this, e);
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

    var wrapped;

    if (typeof listener === "object") {
      wrapped = wrapObject(listener, handler, "handleEvent");
    } else {
      wrapped = wrap(listener, handler);
    }

    return originalAdd.call(this, type, wrapped, useCapture);
  };

  object.removeEventListener = function(type, listener, useCapture) {
    originalRemove.call(this, type, listener, useCapture);

    var wrapped;

    if (typeof listener === "object") {
      wrapped = wrapObject(listener, handler, "handleEvent");
    } else {
      wrapped = wrap(listener, handler);
    }

    return originalRemove.call(this, type, wrapped, useCapture);
  };
}

/**
 * Wraps a given object so that all of it's methods have their exceptions handled
 * by the given handler.
 *
 * @param object - Object to be wrapped.
 * @param handler - Exception handler to be called when an exception is caught.
 * @param fields [optional] - Whitelist of fields that should be wrapped. If not given
 *                            or empty every field that is a function will be wrapped
 */
function wrapObject(object, handler, fields, context) {
  for (key in object) {
    if (object.hasOwnProperty(key)) {
      var val = object[key];

      if (typeof val === "function") {
        if (typeof fields === "undefined" || fields.length === 0 || fields.indexOf(val.name || key) != -1) {
          object[key] = wrap(val, handler, context);
        }
      }
    }
  }
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

  addHandler("DOMContentLoaded", function() { wrapEventHandlers(handler); });
  window.onerror = errorHandler;
}

function wrapClick(eventHandler) {
  addHandler("click", eventHandler);
}
