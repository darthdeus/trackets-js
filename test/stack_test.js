module("Stacktrace parser");

function parseLineExpectation(line, functionName, file, lineNumber) {
  var match = matchStackLine(line);

  ok(match, "The line should match");
  equal(match[1], functionName);
  equal(match[2], file);
  equal(match[3], lineNumber);
};

test("(Chrome) Single stacktrace lines should be parsed properly", function() {
  parseLineExpectation("    at Object.InjectedScript._evaluateOn (<anonymous>:581:39)",
                       "Object.InjectedScript._evaluateOn",
                       "<anonymous>",
                       "581");

  parseLineExpectation("    at b (<anonymous>:25:9)",
                       "b",
                       "<anonymous>",
                       "25");
});

test("(Chrome) A whole stacktrace is parsed properly", function() {
  var stack = "Error: Something went wrong\n" +
    "    at b (<anonymous>:25:9)\n" +
    "    at a (<anonymous>:21:3)\n" +
    "    at HTMLDocument.<anonymous> (<anonymous>:30:3)\n" +
    "    at HTMLDocument.wrappedFunction (<anonymous>:4:16)";

  var parsed = parseStack(stack);

  equal(parsed.length, 4, "Stacktrace contains 4 lines");
  equal(parsed[0]["function"], "b", "Function names are parsed properly");
});


test("(Chrome) A whole stacktrace is parsed", function() {
  var stack = "Error: test error\n" +
    "    at <anonymous>:2:13\n" +
    "    at Object.InjectedScript._evaluateOn (<anonymous>:581:39)\n" +
    "    at Object.InjectedScript._evaluateAndWrap (<anonymous>:540:52)\n" +
    "    at Object.InjectedScript.evaluate (<anonymous>:459:21)";

  var parsed = parseStack(stack);
  equal(parsed.length, 3, "Only relevant lines are parsed");
  equal(parsed[0]["line"], "581", "Line numbers are parsed properly");
});


test("(Chrome) Stacktrace normalization", function() {
  var stack = "Error: test error\n" +
              "    at <anonymous>:2:13\n" +
              "    at Object.InjectedScript._evaluateOn (<anonymous>:581:39)\n" +
              "    at Object.InjectedScript._evaluateAndWrap (<anonymous>:540:52)\n" +
              "    at Object.InjectedScript.evaluate (<anonymous>:459:21)";

  var expectation = "Object.InjectedScript._evaluateOn at <anonymous>:581\n" +
                    "Object.InjectedScript._evaluateAndWrap at <anonymous>:540\n" +
                    "Object.InjectedScript.evaluate at <anonymous>:459";

  var normalized = normalizeStack(stack);
  equal(normalized, expectation, "Chrome stacktrace is normalized properly");

});

test("Exception object can be parsed into file name, line number and message", function() {
  try {
    throw new Error("Something went wrong");
  } catch (e) {
    var res = expandError(e);

    equal(res.file_name, "http://localhost:9292/test/stack_test.js");
    equal(res.line_number, 69);
    equal(res.message, "Something went wrong");
  }
});
