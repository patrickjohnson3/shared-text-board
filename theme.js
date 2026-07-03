const themeStorageKey = 'shared-text-board-theme';
const THEME_OPTIONS = [
  { value: 'dark', label: 'dark' },
  { value: 'light', label: 'light' }
];
const validThemes = new Set(THEME_OPTIONS.map((theme) => theme.value));

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
