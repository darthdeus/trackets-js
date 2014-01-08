var CHROME_REGEX = / *at (\S+) \((.+?):(\d+):\d+\)/;

// Safari and Firefox use the same format for stacktraces,
// hence we can use the same regex for both
var FIREFOX_AND_SAFARI_REGEX = / *(\w+)@(.+):(\d+)/;

var PARSERS = [FIREFOX_AND_SAFARI_REGEX, CHROME_REGEX];

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
      results.push({
        "function": match[1],
        "file": match[2],
        "line": match[3]
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
    results.push(line["function"] + " at " + line["file"] + ":" + line["line"]);
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

