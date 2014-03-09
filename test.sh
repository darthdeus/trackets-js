#!/bin/bash

echo "Starting web server"
asdf 1>&2 2> /dev/null &
SERVER=$!

SECONDS=0

echo "Waiting for the server to start up"

while (( SECONDS < 10 )); do
  if nc -z localhost 9292 > /dev/null; then
    break
  fi

  sleep 1
done

if ! nc -z localhost 9292 > /dev/null; then
  printf >&2 'Failed to start\n'

  exit 1
fi

echo "Running tests"
phantomjs runner.js http://localhost:9292/qunit.html

kill -15 $SERVER
