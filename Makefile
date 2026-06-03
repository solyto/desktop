.PHONY: build dist release rerelease start clean

build:
	bash build.sh

dist:
	USE_SYSTEM_FPM=true npm run dist

release:
	bash scripts/release.sh

rerelease:
	bash scripts/rerelease.sh

start:
	npm start

clean:
	rm -rf dist build-src/build build-src/.svelte-kit build-src/node_modules
