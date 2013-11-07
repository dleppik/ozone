#!/bin/sh

cd "$( dirname "${BASH_SOURCE[0]}" )"
cd ..
tsc -m 'amd' --sourcemap src/*.ts src/rowStore/*.ts --out lib/ozone.js
