goog.provide("trackets.polyfill");

// Selectors API Level 1 (http://www.w3.org/TR/selectors-api/)
// http://ajaxian.com/archives/creating-a-queryselector-for-ie-that-runs-at-native-speed
//
if (!document.querySelectorAll) {
  document.querySelectorAll = function (selectors) {
    var style = document.createElement('style'), elements = [], element;
    document.documentElement.firstChild.appendChild(style);
    document._qsa = [];

    style.styleSheet.cssText = selectors + '{x-qsa:expression(document._qsa && document._qsa.push(this))}';
    window.scrollBy(0, 0);
    style.parentNode.removeChild(style);

    while (document._qsa.length) {
      element = document._qsa.shift();
      element.style.removeAttribute('x-qsa');
      elements.push(element);
    }
    document._qsa = null;
    return elements;
  };
}

if (!document.querySelector) {
  document.querySelector = function (selectors) {
    var elements = document.querySelectorAll(selectors);
    return (elements.length) ? elements[0] : null;
  };
}

// ES5 15.9.4.4 Date.now ( )
// From https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Date/now
if (!Date.now) {
  Date.now = function now() {
    return Number(new Date());
  };
}

//
// Events and EventTargets
//

(function(){
  if (!('Element' in window) || Element.prototype.addEventListener || !Object.defineProperty)
    return;

  // interface Event

  // PhaseType (const unsigned short)
  Event.CAPTURING_PHASE = 1;
  Event.AT_TARGET       = 2;
  Event.BUBBLING_PHASE  = 3;

  Object.defineProperties(Event.prototype, {
    CAPTURING_PHASE: { get: function() { return 1; } },
    AT_TARGET:       { get: function() { return 2; } },
    BUBBLING_PHASE:   { get: function() { return 3; } },
    target: {
      get: function() {
        return this.srcElement;
      }},
    currentTarget: {
      get: function() {
        return this._currentTarget;
      }},
    eventPhase: {
      get: function() {
        return (this.srcElement === this.currentTarget) ? Event.AT_TARGET : Event.BUBBLING_PHASE;
      }},
    bubbles: {
      get: function() {
        switch (this.type) {
          // Mouse
        case 'click':
        case 'dblclick':
        case 'mousedown':
        case 'mouseup':
        case 'mouseover':
        case 'mousemove':
        case 'mouseout':
        case 'mousewheel':
          // Keyboard
        case 'keydown':
        case 'keypress':
        case 'keyup':
          // Frame/Object
        case 'resize':
        case 'scroll':
          // Form
        case 'select':
        case 'change':
        case 'submit':
        case 'reset':
          return true;
        }
        return false;
      }},
    cancelable: {
      get: function() {
        switch (this.type) {
          // Mouse
        case 'click':
        case 'dblclick':
        case 'mousedown':
        case 'mouseup':
        case 'mouseover':
        case 'mouseout':
        case 'mousewheel':
          // Keyboard
        case 'keydown':
        case 'keypress':
        case 'keyup':
          // Form
        case 'submit':
          return true;
        }
        return false;
      }},
    timeStamp: {
      get: function() {
        return this._timeStamp;
      }},
    stopPropagation: {
      value: function() {
        this.cancelBubble = true;
      }},
    preventDefault: {
      value: function() {
        this.returnValue = false;
      }},
    defaultPrevented: {
      get: function() {
        return this.returnValue === false;
      }}
  });

  // interface EventTarget

  function addEventListener(type, listener, useCapture) {
    if (type === 'DOMContentLoaded') type = 'load';
    var target = this;
    var f = function(e) {
      e._timeStamp = Date.now();
      e._currentTarget = target;
      listener.call(this, e);
      e._currentTarget = null;
    };
    this['_' + type + listener] = f;
    this.attachEvent('on' + type, f);
  }

  function removeEventListener(type, listener, useCapture) {
    if (type === 'DOMContentLoaded') type = 'load';
    var f = this['_' + type + listener];
    if (f) {
      this.detachEvent('on' + type, f);
      this['_' + type + listener] = null;
    }
  }

  [Window, HTMLDocument, Element].forEach(function(o) {
    o.prototype.addEventListener = addEventListener;
    o.prototype.removeEventListener = removeEventListener;
  });

}());

// Shim for DOM Events for IE7-
// http://www.quirksmode.org/blog/archives/2005/10/_and_the_winner_1.html
// Use addEvent(object, event, handler) instead of object.addEventListener(event, handler)

window["addEvent"] = function (obj, type, fn) {
  if (obj.addEventListener) {
    obj.addEventListener(type, fn, false);
  } else if (obj.attachEvent) {
    obj["e" + type + fn] = fn;
    obj[type + fn] = function () {
      var e = window.event;
      e.currentTarget = obj;
      e.preventDefault = function () { e.returnValue = false; };
      e.stopPropagation = function () { e.cancelBubble = true; };
      e.target = e.srcElement;
      e.timeStamp = Date.now();
      obj["e" + type + fn].call(this, e);
    };
    obj.attachEvent("on" + type, obj[type + fn]);
  }
};

window["removeEvent"] = function (obj, type, fn) {
  if (obj.removeEventListener) {
    obj.removeEventListener(type, fn, false);
  } else if (obj.detachEvent) {
    obj.detachEvent("on" + type, obj[type + fn]);
    obj[type + fn] = null;
    obj["e" + type + fn] = null;
  }
};

//
// XMLHttpRequest (http://www.w3.org/TR/XMLHttpRequest/)
//
var XMLHttpRequest = window.XMLHttpRequest || function () {
  /*global ActiveXObject*/
  try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch (e1) { }
  try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch (e2) { }
  try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e3) { }
  throw Error("This browser does not support XMLHttpRequest.");
};

XMLHttpRequest.UNSENT = 0;
XMLHttpRequest.OPENED = 1;
XMLHttpRequest.HEADERS_RECEIVED = 2;
XMLHttpRequest.LOADING = 3;
XMLHttpRequest.DONE = 4;

window["XMLHttpRequest"] = XMLHttpRequest;

//
// FormData (http://www.w3.org/TR/XMLHttpRequest2/#interface-formdata)
//
if (!('FormData' in window)) {
  (function(global) {
    function FormData(form) {
      this._data = [];
      if (!form) return;
      for (var i = 0; i < form.elements.length; ++i)
        this.append(form.elements[i].name, form.elements[i].value);
    }

    FormData.prototype.append = function(name, value /*, filename */) {
      if ('Blob' in global && value instanceof global.Blob) throw TypeError("Blob not supported");
      name = String(name);
      this._data.push([name, value]);
    };

    FormData.prototype.toString = function() {
      return this._data.map(function(pair) {
        return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1]);
      }).join('&');
    };

    global.FormData = FormData;
    var send = global.XMLHttpRequest.prototype.send;
    global.XMLHttpRequest.prototype.send = function(body) {
      if (body instanceof FormData) {
        this.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        arguments[0] = body.toString();
      }
      return send.apply(this, arguments);
    };
  }(this));
}
