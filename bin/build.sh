#!/usr/bin/env bash

#
# Unix build script for this script.
#

cd "$( dirname "${BASH_SOURCE[0]}" )"
cd ..
tsc -m 'amd' --sourcemap src/*.ts src/intSet/*.ts src/rowStore/*.ts src/columnStore/*.ts src/serialization/*.ts --out ozone.js
