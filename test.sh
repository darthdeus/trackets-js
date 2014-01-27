#!/bin/bash

echo "Starting web server"
asdf 1>&2 2> /dev/null &
echo "Waiting for the server to start up"
sleep 2
SERVER=$!

echo "Running phantom JS"
phantomjs runner.js http://localhost:9292/qunit.html

kill $SERVER
