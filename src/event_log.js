goog.provide("trackets.eventLog");

function EventLog() {
  this.data = [];

  this.push = function(event, data) {
    var result = data ? JSON.parse(JSON.stringify(data)) : {};

    result["event"] = event;
    result["timestamp"] = +new Date();

    this.data.push(result);
  };
}
