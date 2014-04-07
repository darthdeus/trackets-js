goog.require("trackets.wrapper");
goog.provide("trackets.jquery");

var isJqueryInit = false;
function initJquery(errorHandler) {
  if(isJqueryInit) return true;
  if(!window.jQuery || !window.jQuery.fn) return false;

  var _jQueryReady = jQuery.fn.ready;
  if(_jQueryReady) {
    isJqueryInit = true;
    jQuery.fn.ready = function(f) {
      return _jQueryReady(wrap(f, errorHandler));
    };
    return true;
  }

  return false;
}
