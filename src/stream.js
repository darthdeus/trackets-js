function Stream() {
  this.subscribers = [];

  this.push = function(value) {
    for (var i = 0, l = this.subscribers.length; i < l; i ++) {
      var f = this.subscribers[i];

      f.call(this, value);
    }
  };

  this.subscribe = function(f) {
    this.subscribers.push(f);
  };
}
