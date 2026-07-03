let globalDocument;

function setGlobalDocument(document) {
  globalDocument = document;
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
    this.expectedQuerySelector = '';
    this.focusableControls = [];
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

  querySelectorAll(selector) {
    if (this.expectedQuerySelector && selector !== this.expectedQuerySelector) {
      throw new Error(`Unexpected selector: ${selector}`);
    }
    return this.focusableControls;
  }

  async dispatchEvent(type, event = {}) {
    const listeners = this.listeners[type] || [];
    const dispatchedEvent = {
      ...event,
      target: event.target || this,
      defaultPrevented: false
    };
    dispatchedEvent.preventDefault = function preventDefault() {
      this.defaultPrevented = true;
    };

    for (const listener of listeners) {
      await listener(dispatchedEvent);
    }
    return dispatchedEvent;
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

module.exports = {
  Element,
  InputElement,
  SelectElement,
  TextAreaElement,
  setGlobalDocument
};
