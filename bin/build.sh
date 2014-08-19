#!/usr/bin/env bash

#
# Unix build script for this script.
#

cd "$( dirname "${BASH_SOURCE[0]}" )"
cd ..
tsc -d -m 'commonjs' --sourcemap src/*.ts src/intSet/*.ts src/rowStore/*.ts src/columnStore/*.ts src/serialization/*.ts --out ozone.js
echo 'if (typeof(module) !== "undefined") { module.exports = ozone;}' >> ozone.js
