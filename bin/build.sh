#!/usr/bin/env bash

#
# Unix build script for this script.
#

cd "$( dirname "${BASH_SOURCE[0]}" )"
cd ..
tsc -d -m 'commonjs' --sourcemap src/*.ts src/intSet/*.ts src/rowStore/*.ts src/columnStore/*.ts src/serialization/*.ts --out ozone.js
echo '' >> ozone.js
echo 'if (typeof(module) !== "undefined") { module.exports = ozone;}' >> ozone.js

uglifyjs --in-source-map ozone.js.map  --source-map ozone.min.js.map  -o ozone.min.js ozone.js