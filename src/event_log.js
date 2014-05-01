goog.provide("trackets.eventLog");

function EventLog(limit) {
  this.limit = limit;
  this.data = [];

  this.push = function(event, data) {
    var result = data ? JSON.parse(JSON.stringify(data)) : {};

    result["type"] = event;
    result["timestamp"] = +new Date();

    if (this.data.length >= this.limit) {
      var first = this.data[0];
      var newData = this.data.slice(2);
      newData.unshift(first);
      this.data = newData;
    }

    this.data.push(result);
  };
}
