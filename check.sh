#!/usr/bin/env sh
set -eu

for script in dom.js modes.js panel.js speech.js fullscreen.js app.js; do
  node --check "$script"
done
node --check smoke-test.js
node smoke-test.js
