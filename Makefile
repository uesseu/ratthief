src_dir=src
dist_dir=dist
options=-t es5 -lib esnext,dom --outDir ${dist_dir}
main: ${dist_dir}/test.js ${dist_dir}/parser.js
	:
test: ${dist_dir}/test.js ${dist_dir}/parser.js
	node ${dist_dir}/test.js
${dist_dir}/parser.js: ${src_dir}/parser.ts
	tsc ${src_dir}/parser.ts ${options}
${dist_dir}/test.js: ${src_dir}/test.ts
	tsc ${src_dir}/test.ts ${options}
cli.js:
	tsc ${src_dir}/cli.ts ${options}
