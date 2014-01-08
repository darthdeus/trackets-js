module("Wrapper");

test("wrap on a function handles it's errors", function() {
  var f = function() {
    throw new Error("test error message");
  };

  var wrapped = wrap(f, function(e) {
    equal(e.message, "test error message");
  });

  wrapped();
});

test("wrapped function is wrapped", function() {
  var f = function() { };

  var wrapped = wrap(f);
  ok(wrapped.isWrapped, "Wrapped function is wrapped");
  ok(!f.isWrapped, "Original function remains untouched");
});

test("wrapping a function with no handler simply re-throws the error", function() {
  var f = function() { throw new Error("test error message"); }
  var wrapped = wrap(f);

  try {
    wrapped();
  } catch (e) {
    equal(e.message, "test error message");
  }
});

test("wrapped function can be given as a string, in which case it's evaled", function() {
  window.__global_function_name = function() { throw new Error("test error message"); }
  var wrapped = wrap("__global_function_name()");

  try {
    wrapped();
  } catch (e) {
    equal(e.message, "test error message");
  }
});
