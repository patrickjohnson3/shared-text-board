const themeStorageKey = 'shared-text-board-theme';
const THEME_OPTIONS = [
  { value: 'dark', label: 'dark' },
  { value: 'light', label: 'light' }
];
const validThemes = new Set(THEME_OPTIONS.map((theme) => theme.value));

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function loadTheme() {
  return safeLocalStorageGet(themeStorageKey) === 'light' ? 'light' : 'dark';
}

function saveTheme(nextTheme) {
  safeLocalStorageSet(themeStorageKey, nextTheme);
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
