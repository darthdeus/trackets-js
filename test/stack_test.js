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


//test("(Chrome) A whole stacktrace is parsed", function() {
  //var stack = "Error: test error\n" +
    //"    at <anonymous>:2:13\n" +
    //"    at Object.InjectedScript._evaluateOn (<anonymous>:581:39)\n" +
    //"    at Object.InjectedScript._evaluateAndWrap (<anonymous>:540:52)\n" +
    //"    at Object.InjectedScript.evaluate (<anonymous>:459:21)";

  //var parsed = parseStack(stack);
  //equal(parsed.length, 4, "Only relevant lines are parsed");
  //equal(parsed[0]["line"], "2", "Line numbers are parsed properly");
//});


test("(Chrome) Stacktrace normalization", function() {
  var stack = "Error: test error\n" +
              "    at <anonymous>:2:13\n" +
              "    at Object.InjectedScript._evaluateOn (<anonymous>:581:39)\n" +
              "    at Object.InjectedScript._evaluateAndWrap (<anonymous>:540:52)\n" +
              "    at Object.InjectedScript.evaluate (<anonymous>:459:21)";

  var expectation = "<anonymous>:2:13\n" +
                    "Object.InjectedScript._evaluateOn at <anonymous>:581:39\n" +
                    "Object.InjectedScript._evaluateAndWrap at <anonymous>:540:52\n" +
                    "Object.InjectedScript.evaluate at <anonymous>:459:21";

  var normalized = normalizeStack(stack);
  equal(normalized, expectation, "Chrome stacktrace is normalized properly");

});

test("Exception object can be parsed into file name, line number and message", function() {
  try {
    throw new Error("Something went wrong");
  } catch (e) {
    var res = expandError(e);

    equal(res.file, "http://localhost:9292/test/stack_test.js");
    equal(res.line, 70);
    equal(res.message, "Something went wrong");
  }
});

test("(Firefox) Error outside of the method is parsed properly", function() {
  var stack = "@http://trackets.dev/error.min.js:1\n" +
              "f.Callbacks/n@http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.1.min.js:2\n" +
              "f.Callbacks/o.fireWith@http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.1.min.js:2\n" +
              "f</<.ready@http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.1.min.js:2\n" +
              "f</B@http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.1.min.js:2";

  var parsed = parseStack(stack);
  equal(parsed.length, 5, "All relevant lines are parsed");
  equal(parsed[0]["line"], "1", "Line numbers are parsed properly");
  equal(parsed[0]["column"], undefined, "It won't parse column number from stacktrace");
  equal(parsed[0]["function"], undefined, "Function will be undefined");
});

test("(Safari) Error outside of the method is parsed properly", function() {
  var stack = "http://trackets.dev/error.min.js:1:97 (error.min.js, line 1)\n" +
              "n@http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.1.min.js:2:29307\n" +
              "fireWith@http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.1.min.js:2:30072\n" +
              "ready@http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.1.min.js:2:16007\n" +
              "B@http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.1.min.js:2:20579";


  var parsed = parseStack(stack);
  equal(parsed.length, 5, "All relevant lines are parsed");
  equal(parsed[0]["line"], "1", "Line numbers are parsed properly");
  equal(parsed[0]["column"], 97, "It will parse column number from stacktrace");
  equal(parsed[0]["function"], undefined, "Function will be undefined");
});
