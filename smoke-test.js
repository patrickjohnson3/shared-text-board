const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('app.js', 'utf8');

const requiredIds = [
  'status',
  'textBox',
  'numberBox',
  'yesNoDisplay',
  'textMode',
  'numberMode',
  'yesNoMode',
  'yesBtn',
  'noBtn',
  'speakBtn',
  'optionsBtn',
  'clearBtn',
  'closeOptionsBtn',
  'panelBackdrop',
  'optionsPanel',
  'themeSelect',
  'fullscreenBtn'
];

const missingIds = requiredIds.filter((id) => !html.includes(`id="${id}"`));
if (missingIds.length) {
  throw new Error(`Missing required element id(s): ${missingIds.join(', ')}`);
}

new vm.Script(script, { filename: 'app.js' });
console.log('smoke test passed');
