FILES=--js src/*.js --manage_closure_dependencies

default:
	@closure-compiler ${FILES} --compilation_level WHITESPACE_ONLY --formatting=PRETTY_PRINT > dist/main.js

advanced:
	@closure-compiler ${FILES} --compilation_level ADVANCED_OPTIMIZATIONS > dist/main.min.js

