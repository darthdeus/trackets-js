module("Queue");

test("Things can be pushed onto the queue", function() {
  var q = new Queue();
  q.push(1);

  equal(q.pop(), 1, "Popped item should be the one pushed into the queue");
});

asyncTest("Worker works with a timeout", function() {
  expect(1);

  var q = new Queue(20);

  q.worker = function(item) {
    equal(item, "derpina", "worker worked");
    q.stop();
    start();
  };

  q.push("derpina");

  q.start();
});

asyncTest("Queue can tick manually", function() {
  expect(1);

  var q = new Queue(500000000);

  q.worker = function(item) {
    equal(item, "derpina", "worker worked");
    start();
  };

  q.push("derpina");

  q.tick();
});
