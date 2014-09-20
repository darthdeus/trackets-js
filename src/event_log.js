goog.provide("trackets.eventLog");

function EventLog(limit) {
  this.limit = limit;
  this.data = [];

  this["push"] = function(type, message, level, data) {
    var result = data ? JSON.parse(JSON.stringify(data)) : {};

    var item = {
      "message":   message,
      "type":      type,
      "level":     level || "info",
      "data":      result,
      "timestamp": +new Date()
    };

    if (this.data.length >= this.limit) {
      var first = this.data[0];
      var newData = this.data.slice(2);
      newData.unshift(first);
      this.data = newData;
    }

    this.data.push(item);
  };
}
