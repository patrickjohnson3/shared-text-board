const body = document.body;
const statusEl = document.getElementById('status');
const textBox = document.getElementById('textBox');
const numberBox = document.getElementById('numberBox');
const yesNoDisplay = document.getElementById('yesNoDisplay');
const optionsBtn = document.getElementById('optionsBtn');
const closeOptionsBtn = document.getElementById('closeOptionsBtn');
const panelBackdrop = document.getElementById('panelBackdrop');
const optionsPanel = document.getElementById('optionsPanel');
const themeSelect = document.getElementById('themeSelect');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const themeStorageKey = 'shared-text-board-theme';
const panelControls = [closeOptionsBtn, themeSelect, fullscreenBtn];

const modes = {
  text: {
    button: document.getElementById('textMode'),
    className: 'mode-text',
    status: 'text mode',
    getText: () => textBox.value.trim(),
    clear: () => {
      textBox.value = '';
      textBox.focus();
    },
    focus: () => textBox.focus()
  },
  number: {
    button: document.getElementById('numberMode'),
    className: 'mode-number',
    status: 'number mode',
    getText: () => numberBox.value.trim(),
    clear: () => {
      numberBox.value = '';
      numberBox.focus();
    },
    focus: () => numberBox.focus()
  },
  yesno: {
    button: document.getElementById('yesNoMode'),
    className: 'mode-yesno',
    status: 'yes/no mode',
    getText: () => yesNoValue.trim(),
    clear: () => setYesNo('yes?')
  }
};

let mode = 'text';
let yesNoValue = 'yes?';
let theme = loadTheme();
let panelReturnFocus = optionsBtn;

function setStatus(message) {
  statusEl.textContent = message;
}

function currentText() {
  return modes[mode].getText();
}

function setMode(nextMode) {
  mode = nextMode;

  Object.values(modes).forEach((modeConfig) => {
    const active = modeConfig === modes[nextMode];
    body.classList.toggle(modeConfig.className, active);
    modeConfig.button.classList.toggle('active', active);
    modeConfig.button.setAttribute('aria-pressed', String(active));
  });

  setStatus(modes[nextMode].status);

  window.setTimeout(() => {
    modes[nextMode].focus?.();
  }, 30);
}

function setYesNo(value) {
  yesNoValue = value;
  yesNoDisplay.textContent = value;
}

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

function clearBoard() {
  window.speechSynthesis?.cancel?.();
  modes[mode].clear();
}

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
  theme = nextTheme;
  body.dataset.theme = nextTheme;
  themeSelect.value = nextTheme;
  saveTheme(nextTheme);
}

function setPanelOpen(isOpen, options = {}) {
  const { restoreFocus = true } = options;

  if (isOpen) {
    panelReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : optionsBtn;
  }

  body.classList.toggle('panel-open', isOpen);
  optionsBtn.setAttribute('aria-expanded', String(isOpen));
  optionsPanel.setAttribute('aria-hidden', String(!isOpen));
  optionsPanel.inert = !isOpen;
  panelControls.forEach((control) => {
    if (isOpen) {
      control.removeAttribute('tabindex');
    } else {
      control.setAttribute('tabindex', '-1');
    }
  });

  if (isOpen) {
    themeSelect.focus();
  } else if (restoreFocus && panelReturnFocus?.isConnected) {
    panelReturnFocus.focus();
  }
}

function openPanel() {
  if (body.classList.contains('panel-open')) return;
  setPanelOpen(true);
}

function closePanel(options = {}) {
  setPanelOpen(false, options);
}

function setFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenBtn.textContent = isFullscreen ? 'exit fullscreen' : 'full screen';
  fullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
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
      await document.documentElement.requestFullscreen();
    }
    closePanel({ restoreFocus: false });
  } catch {
    setStatus('fullscreen blocked');
  }
}

function isEditingText(event) {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
}

function isExactCommand(event, key) {
  const hasOneCommandKey = event.ctrlKey !== event.metaKey;
  return hasOneCommandKey && !event.altKey && !event.shiftKey && !event.repeat && event.key.toLowerCase() === key;
}

function handleShortcut(event) {
  if (isExactCommand(event, 'enter') && !isEditingText(event)) {
    event.preventDefault();
    speak();
  }

  if (isExactCommand(event, 'backspace') && !isEditingText(event)) {
    event.preventDefault();
    clearBoard();
  }

  if (isExactCommand(event, ',') && !isEditingText(event)) {
    event.preventDefault();
    openPanel();
  }
}

function handleEscape(event) {
  if (event.key === 'Escape' && body.classList.contains('panel-open')) {
    event.preventDefault();
    closePanel();
  }
}

Object.entries(modes).forEach(([modeName, modeConfig]) => {
  modeConfig.button.addEventListener('click', () => setMode(modeName));
});

document.getElementById('yesBtn').addEventListener('click', () => setYesNo('yes'));
document.getElementById('noBtn').addEventListener('click', () => setYesNo('no'));
document.getElementById('speakBtn').addEventListener('click', speak);
optionsBtn.addEventListener('click', openPanel);
closeOptionsBtn.addEventListener('click', closePanel);
panelBackdrop.addEventListener('click', closePanel);
themeSelect.addEventListener('change', (event) => setTheme(event.target.value));
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.getElementById('clearBtn').addEventListener('click', clearBoard);
document.addEventListener('fullscreenchange', setFullscreenButton);
document.addEventListener('keydown', handleShortcut);
document.addEventListener('keydown', handleEscape);
setPanelOpen(false, { restoreFocus: false });
setTheme(theme);
setFullscreenButton();
