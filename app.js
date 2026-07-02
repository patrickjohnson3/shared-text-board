// Elements
const elements = {
  app: document.querySelector('.app'),
  body: document.body,
  status: document.getElementById('status'),
  textBox: document.getElementById('textBox'),
  numberBox: document.getElementById('numberBox'),
  yesNoDisplay: document.getElementById('yesNoDisplay'),
  textMode: document.getElementById('textMode'),
  numberMode: document.getElementById('numberMode'),
  yesNoMode: document.getElementById('yesNoMode'),
  yesBtn: document.getElementById('yesBtn'),
  noBtn: document.getElementById('noBtn'),
  speakBtn: document.getElementById('speakBtn'),
  optionsBtn: document.getElementById('optionsBtn'),
  clearBtn: document.getElementById('clearBtn'),
  closeOptionsBtn: document.getElementById('closeOptionsBtn'),
  panelBackdrop: document.getElementById('panelBackdrop'),
  optionsPanel: document.getElementById('optionsPanel'),
  themeSelect: document.getElementById('themeSelect'),
  fullscreenBtn: document.getElementById('fullscreenBtn')
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
    valueElement: elements.textBox
  },
  number: {
    button: elements.numberMode,
    className: 'mode-number',
    status: 'number mode',
    valueElement: elements.numberBox
  },
  yesno: {
    button: elements.yesNoMode,
    className: 'mode-yesno',
    status: 'yes/no mode'
  }
};

const shortcuts = [
  { key: 'enter', action: speak, allowInTextField: false },
  { key: 'backspace', action: clearBoard, allowInTextField: false },
  { key: ',', action: openPanel, allowInTextField: false }
];

// Status and modes
function setStatus(message) {
  elements.status.textContent = message;
}

function currentText() {
  if (state.mode === 'yesno') return state.yesNoValue.trim();
  return modeConfigs[state.mode].valueElement.value.trim();
}

function setMode(nextMode) {
  blurActiveTextField();
  state.mode = nextMode;

  Object.entries(modeConfigs).forEach(([modeName, config]) => {
    const active = modeName === nextMode;
    elements.body.classList.toggle(config.className, active);
    config.button.classList.toggle('active', active);
    config.button.setAttribute('aria-pressed', String(active));
  });

  setStatus(modeConfigs[nextMode].status);
}

function setYesNo(value) {
  state.yesNoValue = value;
  elements.yesNoDisplay.textContent = value;
}

function clearBoard() {
  window.speechSynthesis?.cancel?.();
  blurActiveTextField();

  if (state.mode === 'yesno') {
    setYesNo('');
    return;
  }

  const valueElement = modeConfigs[state.mode].valueElement;
  valueElement.value = '';
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
  elements.body.dataset.theme = nextTheme;
  elements.themeSelect.value = nextTheme;
  saveTheme(nextTheme);
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

function syncPanelAttributes(isOpen) {
  elements.body.classList.toggle('panel-open', isOpen);
  setInert(elements.app, isOpen);
  elements.app.setAttribute('aria-hidden', String(isOpen));
  elements.optionsBtn.setAttribute('aria-expanded', String(isOpen));
  elements.optionsPanel.setAttribute('aria-hidden', String(!isOpen));
  setPanelControlsEnabled(isOpen);
}

function openPanel() {
  if (elements.body.classList.contains('panel-open')) return;
  state.panelReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : elements.optionsBtn;
  syncPanelAttributes(true);
  elements.themeSelect.focus();
}

function closePanel(options = {}) {
  const { restoreFocus = true } = options;
  syncPanelAttributes(false);

  if (restoreFocus && state.panelReturnFocus?.isConnected) {
    state.panelReturnFocus.focus();
  }
}

// Fullscreen
function syncFullscreenState() {
  const isFullscreen = Boolean(document.fullscreenElement);
  elements.fullscreenBtn.textContent = isFullscreen ? 'exit fullscreen' : 'full screen';
  elements.fullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
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
    if (!shortcut.allowInTextField && isEditingText(event)) return;

    event.preventDefault();
    shortcut.action();
  });
}

function handleEscape(event) {
  if (event.key === 'Escape' && elements.body.classList.contains('panel-open')) {
    event.preventDefault();
    closePanel();
  }
}

function handlePanelTab(event) {
  if (event.key !== 'Tab' || !elements.body.classList.contains('panel-open')) return;

  const firstControl = panelControls[0];
  const lastControl = panelControls[panelControls.length - 1];

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
  syncPanelAttributes(false);
  setTheme(state.theme);
  syncFullscreenState();
}

init();
