OPTIONS=--manage_closure_dependencies --only_closure_dependencies --closure_entry_point trackets.main
FILES=--js src/*.js
# DEBUG=--formatting=PRETTY_PRINT


default:
	@closure-compiler ${OPTIONS} ${FILES} --compilation_level WHITESPACE_ONLY --formatting=PRETTY_PRINT > dist/main.js

simple:
	@closure-compiler ${OPTIONS} ${FILES} --formatting=PRETTY_PRINT > dist/main.js

advanced:
	@closure-compiler ${OPTIONS} ${FILES} ${DEBUG} --compilation_level ADVANCED_OPTIMIZATIONS > dist/main.min.js

