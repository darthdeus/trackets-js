module("event log");

test("it accepts event name and data object", function() {
  var log = new EventLog();
  log.push("some-event");

  var item = log.data[0];

  equal(item.type, "some-event", "Event name is passed properly");
  ok(Math.abs(item.timestamp - +new Date()) < 1000);
});

test("perserves the original data", function() {
  var log = new EventLog();
  log.push("some-event", null, null, { foo: "bar" });

  var item = log.data[0];

  equal(item.type, "some-event", "Event name is passed properly");
  equal(item.data.foo, "bar", "Original data attributes are perserved");
  ok(Math.abs(item.timestamp - +new Date()) < 1000);
});

test("the original object isn't modified when it's passed to the log function", function() {
  var obj = { foo: "bar" };
  var log = new EventLog();

  var origKeys = Object.keys(obj);

  log.push("some-event", obj);

  var newKeys = Object.keys(obj);

  equal(origKeys.length, newKeys.length);
  equal(origKeys[0], newKeys[0]);
});

test("can handle an empty data object", function() {
  var log = new EventLog();
  log.push("some-event");

  equal(log.data.length, 1);
});

test("can be limited", function() {
  var log = new EventLog(4);
  log.push("some-event", null, null, { message: "first" });
  log.push("some-event", null, null, { message: "second" });
  log.push("some-event", null, null, { message: "third" });
  log.push("some-event", null, null, { message: "fourth" });
  log.push("some-event", null, null, { message: "fifth" });
  log.push("some-event", null, null, { message: "sixth" });

  // should be 4, since we always want to keep the first and last one
  equal(log.data.length, 4);
  equal(log.data[0].data.message, "first");
  equal(log.data[1].data.message, "fourth");
  equal(log.data[2].data.message, "fifth");
  equal(log.data[3].data.message, "sixth");
});
