goog.provide("trackets.ajax");

function sendRequest(url, postData) {
  var req = new window.XMLHttpRequest();
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
