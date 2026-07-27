.PHONY: build dist release rerelease start clean

build:
	bash scripts/build.sh

dist:
	USE_SYSTEM_FPM=true npm run dist

release:
	bash scripts/release.sh

rerelease:
	bash scripts/rerelease.sh

start:
	npm start

clean:
	rm -rf dist frontend/build frontend/.svelte-kit frontend/node_modules
