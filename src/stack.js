goog.provide("trackets.stack");

var CHROME_REGEX = / *at (\S+) \((.+?):(\d+):(\d+)\)/;
var CHROME_ANONYMOUS_REGEX = / * at (\<anonymous\>)():(\d+):(\d+)/;

var SAFARI_REGEX = / *(\w+@)?(.+):(\d+):(\d+)/;

// Like SAFARI but without column number
var FIREFOX_REGEX = / *(\w?)@(.+):(\d+)/;

var PARSERS = [CHROME_ANONYMOUS_REGEX, CHROME_REGEX, SAFARI_REGEX, FIREFOX_REGEX];

/**
 * Match stacktrace line against all available regular expressions for
 * all browsers and return the first match.
 */
function matchStackLine(line) {
  var match;

  for (var i = 0; i < PARSERS.length; i++) {
    if (match = line.match(PARSERS[i])) {
      return match;
    }
  }
  return null;
}

/**
 * Parse stacktrace from any browser and return a unified representation
 */
function parseStack(stack) {
  var lines = stack.split("\n");
  var results = [];

  for (var i = 0; i < lines.length; i++) {
    var match = matchStackLine(lines[i]);

    if (match) {
      var column = match[4];
      var function_name = match[1];
      if(!column) { column = undefined; }
      if(!function_name) {
        function_name = undefined;
      } else {
        function_name = function_name.replace(new RegExp("@$"), "");
      }

      results.push({
        "function": function_name,
        "file": match[2],
        "line": match[3],
        "column": column
      });
    }
  }

  return results;
}

/**
 * Join a parsed stacktrace into a single string again.
 */
function joinParsedStack(lines) {
  var results = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var joinedLine = line["function"];

    if(line["file"]) {
      joinedLine += " at " + line["file"];
    }

    joinedLine += ":" + line["line"];

    if(line["column"]) {
      joinedLine += ":" + line["column"];
    }

    results.push(joinedLine);
  }

  return results.join("\n");
}

/**
 * Parse stacktrace from any browser and join it back again to a unified string format
 *
 * function at file:line_number
 */
function normalizeStack(stack) {
  if (stack) {
    return joinParsedStack(parseStack(stack));
  }
}

function expandError(error) {
  var stack = parseStack(error.stack);

  if (stack[0]) {
    return {
      file: stack[0].file,
      line: stack[0].line,
      column: stack[0].column || error.columnNumber,
      message: error.message,
      stack: error.stack
    }
  } else {
    // TODO - check if this should ever happen and maybe
    // raise an exception instead?
    return {};
  }

}
