FILES=--js src/*.js --js lib/rsvp.min.js

default:
	closure-compiler ${FILES} --compilation_level WHITESPACE_ONLY --formatting=PRETTY_PRINT

advanced:
	closure-compiler ${FILES} --compilation_level ADVANCED_OPTIMIZATIONS

