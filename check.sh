#!/usr/bin/env sh
set -eu

node --check app.js
node --check smoke-test.js
node smoke-test.js
