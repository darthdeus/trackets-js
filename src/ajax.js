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
        //Trackets.queue.push([url, postData]);
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
    } catch (e) {
      continue;
    }
    break;
  }
  return xmlhttp;
}
