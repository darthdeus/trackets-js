module("Stream");

test("Values can be pushed into the stream", function() {
  expect(0);
  var s = new Stream();

  s.push(1);
  s.push(2);
  s.push(3);
});

test("Subscriber receives a new value pushed to the stream", function() {
  expect(1);

  var s = new Stream();

  s.subscribe(function(value) { equal(value, 1); });
  s.push(1);
});

test("Many subscribers can be added", function() {
  expect(2);

  var s = new Stream();

  s.subscribe(function(value) { equal(value, 1); });
  s.subscribe(function(value) { equal(value, 1); });

  s.push(1);
});

test("Values pushed before the subscriber subscribes are gone forever", function() {
  expect(1);

  var s = new Stream();

  s.push(1);
  s.subscribe(function(value) { equal(value, 2); });
  s.push(2);
});
