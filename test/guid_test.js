module("guid", {
  teardown: function() {
    window.localStorage.clear();
  }
});

test("Generated GUID is always different", function() {
  var gen = new GuidGenerator("some-test-key");
  notEqual(gen.generateGuid(), gen.generateGuid(), "Two generated GUIDs are never the same");
});

test("GUID can be later removed", function() {
  var gen = new GuidGenerator("test-key");

  gen.assignGuid();
  gen.clearGuid();

  equal(window.localStorage.getItem("test-key"), null, "Removed key should not be present anymore");
});

test("Assigned guid is returned when it is created and remains the same until removed", function() {
  var gen = new GuidGenerator("some-other-key");

  var guid = gen.assignGuid();
  ok(guid, "GUID is generated when it's assigned");
  equal(gen.assignGuid(), guid, "Assigning a guid twice has no effect");
});

test("When a GUID is cleared and re-assigned it should be different than the first one", function() {
  var gen = new GuidGenerator("re-assignment-key");

  var first = gen.assignGuid();
  gen.clearGuid();
  var second = gen.assignGuid();

  notEqual(first, second, "Twice the GUID is twice the fun.");
});
