function Queue(interval) {
  this.interval = interval || 5000;
  this.q = [];

  this.push = function(item) {
    this.q.push(item);
  };

  this.pop = function() {
    return this.q.pop();
  };

  var self = this;

  var stream = new Bacon.Bus();

  stream.onValue(function() {
    if (typeof self.worker === "function") {
      if (self.q.length > 0) {
        self.worker.call(self, self.q.pop());
      }
    }
  });

  this.tick = function() {
    stream.push("tick-tick");
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
