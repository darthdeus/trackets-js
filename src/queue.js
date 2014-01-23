goog.provide("trackets.queue");

/**
 * @this {Queue}
 */
function Queue(interval, key) {
  this.key = key;
  this.interval = interval || 5000;

  if (typeof this.key === "undefined") {
    this.q = [];
  } else {
    this.q = JSON.parse(window.localStorage.getItem(key)) || [];
  }

  this.push = function(item) {
    this.q.push(item);

    if (typeof this.key !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(this.q));
    }
  };

  this.pop = function() {
    return this.q.pop();
  };

  var self = this;

  var stream = new Stream();

  stream.subscribe(function() {
    if (typeof self.worker === "function") {
      if (self.q.length > 0) {
        self.worker.call(self, self.q.pop());
      }
    }
  });

  this.tick = function() {
    stream.push("tick");
  };

  this.start = function() {
    self.intervalId = setInterval(function() {
      stream.push("tick");
    }, self.interval);
  };

  this.stop = function() {
    clearInterval(self.intervalId);
  };
}
