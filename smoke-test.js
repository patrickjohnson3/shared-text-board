const fs = require('fs');
const vm = require('vm');
const {
  Element,
  InputElement,
  SelectElement,
  TextAreaElement,
  setGlobalDocument
} = require('./fake-dom');

// Inputs
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map((match) => ({
    filename: match[1],
    source: fs.readFileSync(match[1], 'utf8')
  }));
const expectedScripts = ['dom.js', 'theme.js', 'modes.js', 'panel.js', 'speech.js', 'fullscreen.js', 'shortcuts.js', 'app.js'];
const expectedPanelControlSelector = 'button, select, textarea, input, [tabindex]:not([tabindex="-1"])';

const IDS = {
  status: 'status',
  textBox: 'textBox',
  numberBox: 'numberBox',
  yesNoDisplay: 'yesNoDisplay',
  textMode: 'textMode',
  numberMode: 'numberMode',
  yesNoMode: 'yesNoMode',
  yesBtn: 'yesBtn',
  noBtn: 'noBtn',
  speakBtn: 'speakBtn',
  optionsBtn: 'optionsBtn',
  clearBtn: 'clearBtn',
  closeOptionsBtn: 'closeOptionsBtn',
  panelBackdrop: 'panelBackdrop',
  optionsPanel: 'optionsPanel',
  themeSelect: 'themeSelect',
  fullscreenBtn: 'fullscreenBtn'
};

const requiredIds = Object.values(IDS);

// Assertions
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertRequiredMarkup() {
  const missingIds = requiredIds.filter((id) => !new RegExp(`\\bid="${id}"`).test(html));
  if (missingIds.length) {
    throw new Error(`Missing required element id(s): ${missingIds.join(', ')}`);
  }
}

function assertScriptOrder() {
  const scriptFilenames = scripts.map((script) => script.filename);
  assert(
    scriptFilenames.join(',') === expectedScripts.join(','),
    `Unexpected script order: ${scriptFilenames.join(', ')}`
  );
}

function assertStatus(elements, expected, message) {
  assert(elements.status.textContent === expected, message);
}

function assertText(element, expected, message) {
  assert(element.textContent === expected, message);
}

function assertPressed(button, expected, message) {
  assert(button.getAttribute('aria-pressed') === String(expected), message);
}

function assertTheme(document, expected, message) {
  assert(document.body.dataset.theme === expected, message);
}

function assertThemeOptions(elements) {
  assert(elements.themeSelect.innerHTML.includes('value="dark"'), 'Dark theme option was not rendered');
  assert(elements.themeSelect.innerHTML.includes('value="light"'), 'Light theme option was not rendered');
}

function assertFullscreenTarget(document, expected, message) {
  assert(document.fullscreenElement === expected, message);
}

// Browser harness
function setPanelControls(elements, controls) {
  elements.optionsPanel.focusableControls = controls;
}

function createElements() {
  const textareas = new Set([IDS.textBox, IDS.numberBox]);
  const selects = new Set([IDS.themeSelect]);
  const elements = Object.fromEntries(requiredIds.map((id) => {
    if (selects.has(id)) return [id, new SelectElement(id, 'select')];
    return [id, textareas.has(id) ? new TextAreaElement(id, 'textarea') : new Element(id, 'button')];
  }));

  elements.status.textContent = 'text mode';
  elements.optionsPanel.expectedQuerySelector = expectedPanelControlSelector;
  setPanelControls(elements, [
    elements.closeOptionsBtn,
    elements.themeSelect,
    elements.fullscreenBtn
  ]);
  return elements;
}

function createDocument(elements, app) {
  const document = {
    activeElement: null,
    body: new Element('', 'body'),
    fullscreenElement: null,
    fullscreenEnabled: true,
    listeners: {},
    documentElement: new Element('', 'html'),
    getElementById(id) {
      return elements[id] || null;
    },
    querySelector(selector) {
      return selector === '.app' ? app : null;
    },
    addEventListener(type, listener) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(listener);
    },
    async dispatchKeydown(event) {
      const listeners = this.listeners.keydown || [];
      for (const listener of listeners) {
        await listener({
          altKey: false,
          ctrlKey: false,
          metaKey: false,
          repeat: false,
          shiftKey: false,
          target: this.body,
          preventDefault() {
            this.defaultPrevented = true;
          },
          ...event
        });
      }
    },
    async exitFullscreen() {
      this.fullscreenElement = null;
    }
  };

  document.body.classList.add('mode-text');
  document.activeElement = document.body;
  return document;
}

function createSpeechMock() {
  return {
    lastUtterance: null,
    cancelCount: 0,
    cancel() {
      this.cancelCount += 1;
    },
    speak(utterance) {
      this.lastUtterance = utterance;
    }
  };
}

function createBrowserHarness() {
  const app = new Element('', 'main');
  app.classList.add('app');

  const elements = createElements();
  const document = createDocument(elements, app);
  const speech = createSpeechMock();
  const storage = new Map();

  setGlobalDocument(document);

  const context = {
    console,
    document,
    HTMLElement: Element,
    HTMLInputElement: InputElement,
    HTMLSelectElement: SelectElement,
    HTMLTextAreaElement: TextAreaElement,
    localStorage: {
      getItem(key) {
        return storage.get(key) || null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      }
    },
    SpeechSynthesisUtterance: function SpeechSynthesisUtterance(text) {
      this.text = text;
    },
    window: {
      speechSynthesis: speech
    }
  };

  context.window.document = document;
  return { app, context, document, elements, speech };
}

function runScriptsInBrowserOrder(context) {
  const vmContext = vm.createContext(context);
  scripts.forEach((script) => {
    new vm.Script(script.source, { filename: script.filename }).runInContext(vmContext);
  });
}

function runApp(context) {
  runScriptsInBrowserOrder(context);
}

// Behavior assertions
async function assertAppBehavior(harness) {
  const { app, context, document, elements, speech } = harness;

  context.setMode('missing');
  assertStatus(elements, 'mode unavailable', 'Invalid mode did not update status');

  await elements.numberMode.click();
  assert(document.body.classList.contains('mode-number'), 'Number mode class was not applied');
  assertStatus(elements, 'number mode', 'Number mode status was not updated');
  assertPressed(elements.numberMode, true, 'Number mode aria state was not updated');

  elements.numberBox.value = '123';
  await elements.speakBtn.click();
  assert(speech.lastUtterance.text === '123', 'Speak did not read current mode text');

  speech.speak = () => {
    throw new Error('blocked');
  };
  await elements.speakBtn.click();
  assertStatus(elements, 'speech blocked', 'Blocked speech did not update status');

  speech.speak = function speak(utterance) {
    this.lastUtterance = utterance;
  };
  elements.numberBox.value = '456';
  await document.dispatchKeydown({ key: 'Enter', ctrlKey: true });
  assert(speech.lastUtterance.text === '456', 'Command shortcut did not speak current text');

  elements.numberBox.value = '789';
  await document.dispatchKeydown({ key: 'Backspace', ctrlKey: true });
  assert(elements.numberBox.value === '', 'Command shortcut did not clear active field');

  await document.dispatchKeydown({ key: ',', ctrlKey: true });
  assert(document.body.classList.contains('panel-open'), 'Options panel did not open');
  assert(app.hasAttribute('inert'), 'Main app was not made inert while panel is open');
  assert(!elements.optionsPanel.hasAttribute('inert'), 'Options panel stayed inert after opening');
  assert(document.activeElement === elements.themeSelect, 'Opening panel did not focus theme select');
  assertThemeOptions(elements);

  elements.themeSelect.value = 'light';
  await elements.themeSelect.dispatchEvent('change');
  assertTheme(document, 'light', 'Theme select did not update the body theme');

  context.setTheme('sepia');
  assertStatus(elements, 'theme unavailable', 'Invalid theme did not update status');
  assertTheme(document, 'light', 'Invalid theme changed the body theme');

  document.activeElement = document.body;
  await document.dispatchKeydown({ key: 'Tab' });
  assert(document.activeElement === elements.closeOptionsBtn, 'Tab trap did not recover lost focus');

  setPanelControls(elements, []);
  await document.dispatchKeydown({ key: 'Tab' });
  setPanelControls(elements, [
    elements.closeOptionsBtn,
    elements.themeSelect,
    elements.fullscreenBtn
  ]);

  await elements.fullscreenBtn.click();
  assertFullscreenTarget(document, document.body, 'Fullscreen did not target the page body');
  assertText(elements.fullscreenBtn, 'exit fullscreen', 'Fullscreen button label did not update after entering fullscreen');
  assert(document.activeElement === elements.optionsBtn, 'Fullscreen did not restore focus after closing panel');

  await elements.optionsBtn.click();
  assert(document.body.classList.contains('panel-open'), 'Options panel did not reopen while fullscreen');
  await elements.fullscreenBtn.click();
  assertFullscreenTarget(document, null, 'Fullscreen did not exit');
  assertText(elements.fullscreenBtn, 'full screen', 'Fullscreen button label did not update after exiting fullscreen');

  document.body.requestFullscreen = undefined;
  await elements.optionsBtn.click();
  assert(document.body.classList.contains('panel-open'), 'Options panel did not reopen for fullscreen fallback');
  await elements.fullscreenBtn.click();
  assertFullscreenTarget(document, document.documentElement, 'Fullscreen did not fall back to the document root');
  assertText(elements.fullscreenBtn, 'exit fullscreen', 'Fullscreen button label did not update after fallback fullscreen');

  await elements.clearBtn.click();
  assert(elements.numberBox.value === '', 'Clear did not empty the active field');
}

// Runner
async function main() {
  assertRequiredMarkup();
  assertScriptOrder();
  const harness = createBrowserHarness();
  runApp(harness.context);
  await assertAppBehavior(harness);
  console.log('smoke test passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
