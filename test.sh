#!/bin/bash

echo "Starting ASDF"
asdf 1>&2 2> /dev/null &
echo "waiting 2 seconds"
sleep 2
SERVER=$!

echo "Running phantom JS"
phantomjs runner.js http://localhost:9292/qunit.html

kill $SERVER
