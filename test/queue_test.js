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


module("Queue persistence", {
  teardown: function() {
    window.localStorage.clear();
  }
});

test("Items pushed to a queue are persisted in localStorage", function() {
  var q1 = new Queue(5000, "test-persistence-key");
  q1.push(1);
  q1.push(2);
  q1.push(3);

  var q2 = new Queue(5000, "test-persistence-key");
  equal(q2.pop(), 3, "Item should remain the same even when re-creating a queue");
  equal(q2.pop(), 2, "Item should remain the same even when re-creating a queue");
  equal(q2.pop(), 1, "Item should remain the same even when re-creating a queue");
});
