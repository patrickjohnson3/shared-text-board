const themeStorageKey = 'shared-text-board-theme';
const THEME_OPTIONS = [
  { value: 'dark', label: 'dark' },
  { value: 'light', label: 'light' }
];
const validThemes = new Set(THEME_OPTIONS.map((theme) => theme.value));
const STATUS = {
  modeUnavailable: 'mode unavailable',
  speechUnavailable: 'speech unavailable',
  speechBlocked: 'speech blocked',
  themeUnavailable: 'theme unavailable',
  fullscreenUnavailable: 'fullscreen unavailable',
  fullscreenBlocked: 'fullscreen blocked'
};

const state = {
  mode: 'text',
  yesNoValue: '',
  theme: loadTheme(),
  panelReturnFocus: elements.optionsBtn
};

const shortcuts = [];

function registerCommandShortcut(key, action) {
  shortcuts.push({ key, action, ignoreTextFields: true });
}

function setStatus(message) {
  elements.status.textContent = message;
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

function renderThemeOptions() {
  elements.themeSelect.innerHTML = THEME_OPTIONS
    .map((theme) => `<option value="${theme.value}">${theme.label}</option>`)
    .join('');
}

function setTheme(nextTheme) {
  if (!validThemes.has(nextTheme)) {
    setStatus(STATUS.themeUnavailable);
    return;
  }

  state.theme = nextTheme;
  syncThemeUI();
  saveTheme(nextTheme);
}

function syncThemeUI() {
  elements.body.dataset.theme = state.theme;
  elements.themeSelect.value = state.theme;
}

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
  renderThemeOptions();
  bindEvents();
  syncModeUI();
  syncModalAttributes(false);
  syncThemeUI();
  syncFullscreenState();
}

init();
