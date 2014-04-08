goog.require("trackets.wrapper");
goog.provide("trackets.jquery");

var isJqueryInit = false;

function initJquery(errorHandler) {
  if (isJqueryInit) return true;
  if (!window.jQuery || !window.jQuery.fn) return false;

  // Reports exceptions thrown in jQuery ready callbacks.
  var _jQueryReady = jQuery.fn.ready;
  if (_jQueryReady) {
    jQuery.fn.ready = function(f) {
      return _jQueryReady(wrap(f, errorHandler));
    };
  }

  // Reports exceptions thrown in jQuery event handlers.
  var _jQueryEventAdd = jQuery.event.add;
  if (_jQueryEventAdd) {
    jQuery.event.add = function(elem, types, handler, data, selector) {
      if (handler.handler) {
        if (!handler.handler.guid) {
          handler.handler.guid = jQuery.guid++;
        }
        handler.handler = wrap(handler.handler, errorHandler);
      } else {
        if (!handler.guid) {
          handler.guid = jQuery.guid++;
        }
        handler = wrap(handler, errorHandler);
      }
      return _jQueryEventAdd(elem, types, handler, data, selector);
    }
  }

  // Reports exceptions thrown in jQuery callbacks.
  var _jQueryCallbacks = jQuery.Callbacks;
  if (_jQueryCallbacks) {
    jQuery.Callbacks = function(options) {
      var cb = _jQueryCallbacks(options),
          cbAdd = cb.add;

      cb.add = function() {
        var fns = arguments;

        jQuery.each(fns, function(i, fn) {
          if (jQuery.isFunction(fn)) {
            fns[i] = wrap(fn, errorHandler);
          }
        });

        return cbAdd.apply(this, fns);
      }
      return cb;
    }
  }

  return isJqueryInit = true;
}
