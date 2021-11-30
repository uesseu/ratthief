main: test.js parser1.js
	node test.js
parser1.js: parser1.ts
	tsc parser1.ts -t es5 -lib esnext,dom
test.js: test.ts
	tsc test.ts -t es5 -lib esnext,dom
