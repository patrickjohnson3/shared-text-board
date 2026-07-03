// Elements
function getRequiredElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element: #${id}`);
  return element;
}

function getRequiredSelector(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

const elements = {
  app: getRequiredSelector('.app'),
  body: document.body,
  status: getRequiredElement('status'),
  textBox: getRequiredElement('textBox'),
  numberBox: getRequiredElement('numberBox'),
  yesNoDisplay: getRequiredElement('yesNoDisplay'),
  textMode: getRequiredElement('textMode'),
  numberMode: getRequiredElement('numberMode'),
  yesNoMode: getRequiredElement('yesNoMode'),
  yesBtn: getRequiredElement('yesBtn'),
  noBtn: getRequiredElement('noBtn'),
  speakBtn: getRequiredElement('speakBtn'),
  optionsBtn: getRequiredElement('optionsBtn'),
  clearBtn: getRequiredElement('clearBtn'),
  closeOptionsBtn: getRequiredElement('closeOptionsBtn'),
  panelBackdrop: getRequiredElement('panelBackdrop'),
  optionsPanel: getRequiredElement('optionsPanel'),
  themeSelect: getRequiredElement('themeSelect'),
  fullscreenBtn: getRequiredElement('fullscreenBtn')
};

const themeStorageKey = 'shared-text-board-theme';
const validThemes = new Set(['dark', 'light']);
const panelControls = [elements.closeOptionsBtn, elements.themeSelect, elements.fullscreenBtn];
const STATUS = {
  modeUnavailable: 'mode unavailable',
  speechUnavailable: 'speech unavailable',
  speechBlocked: 'speech blocked',
  themeUnavailable: 'theme unavailable',
  fullscreenUnavailable: 'fullscreen unavailable',
  fullscreenBlocked: 'fullscreen blocked'
};

// State and configuration
const state = {
  mode: 'text',
  yesNoValue: '',
  theme: loadTheme(),
  panelReturnFocus: elements.optionsBtn
};

function modeClass(modeName) {
  return `mode-${modeName}`;
}

function createModeConfig({ modeName, button, status, valueElement }) {
  return {
    button,
    className: modeClass(modeName),
    status,
    valueElement,
    getText() {
      return valueElement.value.trim();
    },
    clear() {
      valueElement.value = '';
    }
  };
}

const modeConfigs = {
  text: createModeConfig({
    modeName: 'text',
    button: elements.textMode,
    status: 'text mode',
    valueElement: elements.textBox
  }),
  number: createModeConfig({
    modeName: 'number',
    button: elements.numberMode,
    status: 'number mode',
    valueElement: elements.numberBox
  }),
  yesno: {
    button: elements.yesNoMode,
    className: modeClass('yesno'),
    status: 'yes/no mode',
    getText() {
      return state.yesNoValue.trim();
    },
    clear() {
      setYesNo('');
    }
  }
};

const shortcuts = [];

function registerCommandShortcut(key, action) {
  shortcuts.push({ key, action, ignoreTextFields: true });
}

// Status and modes
function setStatus(message) {
  elements.status.textContent = message;
}

function currentText() {
  return modeConfigs[state.mode].getText();
}

function syncModeUI() {
  Object.entries(modeConfigs).forEach(([modeName, config]) => {
    const active = modeName === state.mode;
    elements.body.classList.toggle(config.className, active);
    config.button.classList.toggle('active', active);
    config.button.setAttribute('aria-pressed', String(active));
  });

  setStatus(modeConfigs[state.mode].status);
}

function setMode(nextMode) {
  if (!modeConfigs[nextMode]) {
    setStatus(STATUS.modeUnavailable);
    return;
  }

  blurActiveTextField();
  state.mode = nextMode;
  syncUI({ mode: true });
}

function setYesNo(value) {
  state.yesNoValue = value;
  elements.yesNoDisplay.textContent = value;
}

function clearBoard() {
  window.speechSynthesis?.cancel?.();
  blurActiveTextField();

  modeConfigs[state.mode].clear();
}

function blurActiveTextField() {
  if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
    document.activeElement.blur();
  }
}

// Speech
function speak() {
  const text = currentText();
  if (!text) return;

  if (!('speechSynthesis' in window)) {
    setStatus(STATUS.speechUnavailable);
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    setStatus(STATUS.speechBlocked);
  }
}

// Theme
function loadTheme() {
  try {
    return localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function saveTheme(nextTheme) {
  try {
    localStorage.setItem(themeStorageKey, nextTheme);
  } catch {
    return;
  }
}

function setTheme(nextTheme) {
  if (!validThemes.has(nextTheme)) {
    setStatus(STATUS.themeUnavailable);
    return;
  }

  state.theme = nextTheme;
  syncUI({ theme: true });
  saveTheme(nextTheme);
}

function syncThemeUI() {
  elements.body.dataset.theme = state.theme;
  elements.themeSelect.value = state.theme;
}

// Options panel
function setInert(element, isInert) {
  if (isInert) {
    element.setAttribute('inert', '');
  } else {
    element.removeAttribute('inert');
  }
}

function setPanelControlsEnabled(isEnabled) {
  setInert(elements.optionsPanel, !isEnabled);
  panelControls.forEach((control) => {
    if (isEnabled) {
      control.removeAttribute('tabindex');
    } else {
      control.setAttribute('tabindex', '-1');
    }
  });
}

function isPanelOpen() {
  return elements.body.classList.contains('panel-open');
}

function syncModalAttributes(isOpen) {
  elements.body.classList.toggle('panel-open', isOpen);
  setInert(elements.app, isOpen);
  elements.app.setAttribute('aria-hidden', String(isOpen));
  elements.optionsBtn.setAttribute('aria-expanded', String(isOpen));
  elements.optionsPanel.setAttribute('aria-hidden', String(!isOpen));
  setPanelControlsEnabled(isOpen);
}

function focusDefaultPanelControl() {
  elements.themeSelect.focus();
}

function restorePanelFocus() {
  if (state.panelReturnFocus?.isConnected) {
    state.panelReturnFocus.focus();
  }
}

function openModal() {
  if (isPanelOpen()) return;
  state.panelReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : elements.optionsBtn;
  syncUI({ panelOpen: true });
  focusDefaultPanelControl();
}

function closeModal(options = {}) {
  const { restoreFocus = true } = options;
  syncUI({ panelOpen: false });

  if (restoreFocus) {
    restorePanelFocus();
  }
}

function openPanel() {
  openModal();
}

function closePanel(options = {}) {
  closeModal(options);
}

// Fullscreen
function syncFullscreenState() {
  const isFullscreen = Boolean(document.fullscreenElement);
  elements.fullscreenBtn.textContent = isFullscreen ? 'exit fullscreen' : 'full screen';
  elements.fullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
}

function syncUI(options = {}) {
  if (options.mode) syncModeUI();
  if (options.theme) syncThemeUI();
  if (Object.prototype.hasOwnProperty.call(options, 'panelOpen')) syncModalAttributes(options.panelOpen);
  if (options.fullscreen) syncFullscreenState();
}

function fullscreenTarget() {
  if (typeof elements.body.requestFullscreen === 'function') return elements.body;
  if (typeof document.documentElement.requestFullscreen === 'function') return document.documentElement;
  return null;
}

async function toggleFullscreen() {
  if (!document.fullscreenEnabled) {
    setStatus(STATUS.fullscreenUnavailable);
    return;
  }

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      const target = fullscreenTarget();
      if (!target) {
        setStatus(STATUS.fullscreenUnavailable);
        return;
      }
      await target.requestFullscreen();
    }
    closePanel({ restoreFocus: false });
  } catch {
    setStatus(STATUS.fullscreenBlocked);
  }
}

// Shortcuts
registerCommandShortcut('enter', speak);
registerCommandShortcut('backspace', clearBoard);
registerCommandShortcut(',', openPanel);

function isEditingText(event) {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
}

function isExactCommand(event, key) {
  const hasOneCommandKey = event.ctrlKey !== event.metaKey;
  return hasOneCommandKey && !event.altKey && !event.shiftKey && !event.repeat && event.key.toLowerCase() === key;
}

function handleShortcut(event) {
  shortcuts.forEach((shortcut) => {
    if (!isExactCommand(event, shortcut.key)) return;
    if (shortcut.ignoreTextFields && isEditingText(event)) return;

    event.preventDefault();
    shortcut.action();
  });
}

function handleEscape(event) {
  if (event.key === 'Escape' && isPanelOpen()) {
    event.preventDefault();
    closePanel();
  }
}

function handlePanelTab(event) {
  if (event.key !== 'Tab' || !isPanelOpen()) return;

  const firstControl = panelControls[0];
  const lastControl = panelControls[panelControls.length - 1];

  if (!panelControls.includes(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? lastControl : firstControl).focus();
    return;
  }

  if (event.shiftKey && document.activeElement === firstControl) {
    event.preventDefault();
    lastControl.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === lastControl) {
    event.preventDefault();
    firstControl.focus();
  }
}

// Events and init
function bindEvents() {
  Object.entries(modeConfigs).forEach(([modeName, config]) => {
    config.button.addEventListener('click', () => setMode(modeName));
  });

  elements.yesBtn.addEventListener('click', () => setYesNo('yes'));
  elements.noBtn.addEventListener('click', () => setYesNo('no'));
  elements.speakBtn.addEventListener('click', speak);
  elements.optionsBtn.addEventListener('click', openPanel);
  elements.closeOptionsBtn.addEventListener('click', () => closePanel());
  elements.panelBackdrop.addEventListener('click', () => closePanel());
  elements.themeSelect.addEventListener('change', (event) => setTheme(event.target.value));
  elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
  elements.clearBtn.addEventListener('click', clearBoard);
  document.addEventListener('fullscreenchange', syncFullscreenState);
  document.addEventListener('keydown', handleShortcut);
  document.addEventListener('keydown', handleEscape);
  document.addEventListener('keydown', handlePanelTab);
}

function init() {
  bindEvents();
  syncUI({ mode: true, panelOpen: false, theme: true, fullscreen: true });
}

init();
