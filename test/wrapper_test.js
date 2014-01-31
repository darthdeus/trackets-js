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

test("wrap can take a context for the handler", function() {
  var context = { name: "test name" };

  var handler = function() {
    equal(this.name, "test name");
  };

  var f = function() { throw new Error("test error"); }

  wrapped = wrap(f, handler, context);

  wrapped();
});

test("object can be wrapped", function() {
  var obj = {
    a: function() { throw new Error("a"); }
  };

  wrapObject(obj, function(e) {
    equal(e.message, "a");
  });

  obj.a();
});

test("only given methods are wrapped", function() {
  var obj = {
    a: function() { throw new Error("a"); },
    b: function() { throw new Error("b"); }
  };

  wrapObject(obj, function(e) {
    throw new Error("Only given methods are wrapped, other ones are left alone");
  }, ["a"]);

  try {
    obj.b();
  } catch (e) {
    equal(e.message, "b");
  }
})

test("handler can have a context", function() {
  var context = { name: "test name" };

  var handler = function() {
    equal(this.name, "test name");
  };

  var obj = {
    a: function() { throw new Error("test error"); }
  };

  wrapObject(obj, handler, [], context);

  obj.a();
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

test("addEventListener wraps the listener", function() {
  var obj = {
    addEventListener: function(type, listener, capture) {
      this.f = listener;
    },

    removeEventListener: function() {
      delete this.f;
    }
  };

  wrapListenerHandlers(obj, function(e) {
    equal(e.message, "something went wrong");
  });

  obj.addEventListener("foo", function() {
    throw new Error("something went wrong");
  });

  obj.f();
});

test("wrapTimeout", function() {
  expect(2);

  var obj = {
    setTimeout: function(f, timeout) {
      obj.f = f;
    },

    setInterval: function(f, interval) {
      obj.fi = f;
    }
  };

  wrapTimeout(obj, function(e) {
    equal(e.message, "something went wrong");
  });

  obj.setTimeout(function() {
    throw new Error("something went wrong");
  }, 500);

  obj.f();

  obj.setInterval(function() {
    throw new Error("something went wrong");
  }, 500);

  obj.fi();
});
