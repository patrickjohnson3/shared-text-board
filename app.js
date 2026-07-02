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
const panelControls = [elements.closeOptionsBtn, elements.themeSelect, elements.fullscreenBtn];

// State and configuration
const state = {
  mode: 'text',
  yesNoValue: '',
  theme: loadTheme(),
  panelReturnFocus: elements.optionsBtn
};

const modeConfigs = {
  text: {
    button: elements.textMode,
    className: 'mode-text',
    status: 'text mode',
    valueElement: elements.textBox,
    getText() {
      return elements.textBox.value.trim();
    },
    clear() {
      elements.textBox.value = '';
    }
  },
  number: {
    button: elements.numberMode,
    className: 'mode-number',
    status: 'number mode',
    valueElement: elements.numberBox,
    getText() {
      return elements.numberBox.value.trim();
    },
    clear() {
      elements.numberBox.value = '';
    }
  },
  yesno: {
    button: elements.yesNoMode,
    className: 'mode-yesno',
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
    setStatus('speech unavailable');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
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

async function toggleFullscreen() {
  if (!document.fullscreenEnabled) {
    setStatus('fullscreen unavailable');
    return;
  }

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await elements.app.requestFullscreen();
    }
    closePanel({ restoreFocus: false });
  } catch {
    setStatus('fullscreen blocked');
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

const modeController = {
  setMode,
  setYesNo,
  clearBoard
};

const speechController = {
  speak
};

const panelController = {
  open: openPanel,
  close: closePanel
};

const fullscreenController = {
  toggle: toggleFullscreen,
  sync: syncFullscreenState
};

// Events and init
function bindEvents() {
  Object.entries(modeConfigs).forEach(([modeName, config]) => {
    config.button.addEventListener('click', () => modeController.setMode(modeName));
  });

  elements.yesBtn.addEventListener('click', () => modeController.setYesNo('yes'));
  elements.noBtn.addEventListener('click', () => modeController.setYesNo('no'));
  elements.speakBtn.addEventListener('click', speechController.speak);
  elements.optionsBtn.addEventListener('click', panelController.open);
  elements.closeOptionsBtn.addEventListener('click', () => panelController.close());
  elements.panelBackdrop.addEventListener('click', () => panelController.close());
  elements.themeSelect.addEventListener('change', (event) => setTheme(event.target.value));
  elements.fullscreenBtn.addEventListener('click', fullscreenController.toggle);
  elements.clearBtn.addEventListener('click', modeController.clearBoard);
  document.addEventListener('fullscreenchange', fullscreenController.sync);
  document.addEventListener('keydown', handleShortcut);
  document.addEventListener('keydown', handleEscape);
  document.addEventListener('keydown', handlePanelTab);
}

function init() {
  bindEvents();
  syncUI({ mode: true, panelOpen: false, theme: true, fullscreen: true });
}

init();
