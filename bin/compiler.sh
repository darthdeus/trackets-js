exec java -jar $(dirname $0)/compiler.jar --output_wrapper "(function() {%output%})();" "$@"
