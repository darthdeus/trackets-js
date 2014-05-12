goog.provide("trackets.ajax");

function sendRequest(url, postData) {
  var req = createXMLHTTPObject();
  if (!req) return;
  if(postData.length > 100000) return;

  req.open("POST", url, true);
  req.setRequestHeader("Content-type", "application/json");

  req.send(postData);

  req.onreadystatechange = function(e) {
    if (req.readyState == 4) {
      if (req.status != 200 && req.status != 201) {
        console.log("Trackets failed to deliver the error report data.");
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

      xmlhttp.UNSENT = 0;
      xmlhttp.OPENED = 1;
      xmlhttp.HEADERS_RECEIVED = 2;
      xmlhttp.LOADING = 3;
      xmlhttp.DONE = 4;

      if(i > 1) {
        XMLHttpRequest.prototype.send = function(body) {
          if (body instanceof FormData) {
            this.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            arguments[0] = body.toString();
          }
          return send.apply(this, arguments);
        }
      }
    } catch (e) {
      continue;
    }
    break;
  }
  return xmlhttp;
}
