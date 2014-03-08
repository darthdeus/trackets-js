#!/bin/bash
set -e

echo "Starting web server"
asdf 1>&2 2> /dev/null &
echo "Waiting for the server to start up"

SERVER=$!

sleep 2

echo "Running phantom JS"
phantomjs runner.js http://localhost:9292/qunit.html

kill -15 $SERVER
