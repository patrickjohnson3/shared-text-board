const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('app.js', 'utf8');

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertRequiredMarkup() {
  const missingIds = requiredIds.filter((id) => !html.includes(`id="${id}"`));
  if (missingIds.length) {
    throw new Error(`Missing required element id(s): ${missingIds.join(', ')}`);
  }
}

function assertStatus(elements, expected, message) {
  assert(elements.status.textContent === expected, message);
}

function assertTheme(document, expected, message) {
  assert(document.body.dataset.theme === expected, message);
}

function assertFullscreenTarget(document, expected, message) {
  assert(document.fullscreenElement === expected, message);
}

class ClassList {
  constructor(...names) {
    this.names = new Set(names);
  }

  add(name) {
    this.names.add(name);
  }

  remove(name) {
    this.names.delete(name);
  }

  contains(name) {
    return this.names.has(name);
  }

  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.names.has(name) : Boolean(force);
    if (shouldAdd) {
      this.add(name);
    } else {
      this.remove(name);
    }
    return shouldAdd;
  }
}

class Element {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.classList = new ClassList();
    this.dataset = {};
    this.isConnected = true;
    this.listeners = {};
    this.textContent = '';
    this.value = '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  addEventListener(type, listener) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
  }

  async dispatchEvent(type, event = {}) {
    const listeners = this.listeners[type] || [];
    for (const listener of listeners) {
      await listener({ target: this, preventDefault() {}, ...event });
    }
  }

  click() {
    return this.dispatchEvent('click');
  }

  focus() {
    globalDocument.activeElement = this;
  }

  blur() {
    if (globalDocument.activeElement === this) globalDocument.activeElement = globalDocument.body;
  }

  async requestFullscreen() {
    globalDocument.fullscreenElement = this;
  }
}

class InputElement extends Element {}
class SelectElement extends Element {}
class TextAreaElement extends Element {}

let globalDocument;

function createElements() {
  const textareas = new Set([IDS.textBox, IDS.numberBox]);
  const selects = new Set([IDS.themeSelect]);
  const elements = Object.fromEntries(requiredIds.map((id) => {
    if (selects.has(id)) return [id, new SelectElement(id, 'select')];
    return [id, textareas.has(id) ? new TextAreaElement(id, 'textarea') : new Element(id, 'button')];
  }));

  elements.status.textContent = 'text mode';
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

  globalDocument = document;

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

function runApp(context) {
  new vm.Script(script, { filename: 'app.js' }).runInNewContext(context);
}

async function assertAppBehavior(harness) {
  const { app, context, document, elements, speech } = harness;

  context.setMode('missing');
  assertStatus(elements, 'mode unavailable', 'Invalid mode did not update status');

  await elements.numberMode.click();
  assert(document.body.classList.contains('mode-number'), 'Number mode class was not applied');
  assertStatus(elements, 'number mode', 'Number mode status was not updated');
  assert(elements.numberMode.getAttribute('aria-pressed') === 'true', 'Number mode aria state was not updated');

  elements.numberBox.value = '123';
  await elements.speakBtn.click();
  assert(speech.lastUtterance.text === '123', 'Speak did not read current mode text');

  speech.speak = () => {
    throw new Error('blocked');
  };
  await elements.speakBtn.click();
  assertStatus(elements, 'speech blocked', 'Blocked speech did not update status');

  await elements.optionsBtn.click();
  assert(document.body.classList.contains('panel-open'), 'Options panel did not open');
  assert(app.hasAttribute('inert'), 'Main app was not made inert while panel is open');
  assert(!elements.optionsPanel.hasAttribute('inert'), 'Options panel stayed inert after opening');
  assert(document.activeElement === elements.themeSelect, 'Opening panel did not focus theme select');

  elements.themeSelect.value = 'light';
  await elements.themeSelect.dispatchEvent('change');
  assertTheme(document, 'light', 'Theme select did not update the body theme');

  context.setTheme('sepia');
  assertStatus(elements, 'theme unavailable', 'Invalid theme did not update status');
  assertTheme(document, 'light', 'Invalid theme changed the body theme');

  document.activeElement = document.body;
  await document.dispatchKeydown({ key: 'Tab' });
  assert(document.activeElement === elements.closeOptionsBtn, 'Tab trap did not recover lost focus');

  await elements.fullscreenBtn.click();
  assertFullscreenTarget(document, document.body, 'Fullscreen did not target the page body');

  await document.exitFullscreen();
  document.body.requestFullscreen = undefined;
  await elements.fullscreenBtn.click();
  assertFullscreenTarget(document, document.documentElement, 'Fullscreen did not fall back to the document root');

  await elements.clearBtn.click();
  assert(elements.numberBox.value === '', 'Clear did not empty the active field');
}

async function main() {
  assertRequiredMarkup();
  const harness = createBrowserHarness();
  runApp(harness.context);
  await assertAppBehavior(harness);
  console.log('smoke test passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
