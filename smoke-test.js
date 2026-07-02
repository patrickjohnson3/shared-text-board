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

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    document.activeElement = this;
  }

  blur() {
    if (document.activeElement === this) document.activeElement = document.body;
  }

  async requestFullscreen() {
    document.fullscreenElement = this;
  }
}

class InputElement extends Element {}
class TextAreaElement extends Element {}

const app = new Element('', 'main');
app.classList.add('app');

const elements = Object.fromEntries(requiredIds.map((id) => {
  const textareas = new Set(['textBox', 'numberBox']);
  return [id, textareas.has(id) ? new TextAreaElement(id, 'textarea') : new Element(id, 'button')];
}));

elements.status.textContent = 'text mode';

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

const storage = new Map();
const speech = {
  lastUtterance: null,
  cancelCount: 0,
  cancel() {
    this.cancelCount += 1;
  },
  speak(utterance) {
    this.lastUtterance = utterance;
  }
};

const context = {
  console,
  document,
  HTMLElement: Element,
  HTMLInputElement: InputElement,
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

async function main() {
  new vm.Script(script, { filename: 'app.js' }).runInNewContext(context);

  await elements.numberMode.click();
  assert(document.body.classList.contains('mode-number'), 'Number mode class was not applied');
  assert(elements.status.textContent === 'number mode', 'Number mode status was not updated');
  assert(elements.numberMode.getAttribute('aria-pressed') === 'true', 'Number mode aria state was not updated');

  elements.numberBox.value = '123';
  await elements.speakBtn.click();
  assert(speech.lastUtterance.text === '123', 'Speak did not read current mode text');

  await elements.optionsBtn.click();
  assert(document.body.classList.contains('panel-open'), 'Options panel did not open');
  assert(app.hasAttribute('inert'), 'Main app was not made inert while panel is open');
  assert(!elements.optionsPanel.hasAttribute('inert'), 'Options panel stayed inert after opening');
  assert(document.activeElement === elements.themeSelect, 'Opening panel did not focus theme select');

  document.activeElement = document.body;
  await document.dispatchKeydown({ key: 'Tab' });
  assert(document.activeElement === elements.closeOptionsBtn, 'Tab trap did not recover lost focus');

  await elements.fullscreenBtn.click();
  assert(document.fullscreenElement === app, 'Fullscreen did not target the app shell');

  await elements.clearBtn.click();
  assert(elements.numberBox.value === '', 'Clear did not empty the active field');

  console.log('smoke test passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
