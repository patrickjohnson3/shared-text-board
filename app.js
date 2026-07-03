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

function setStatus(message) {
  elements.status.textContent = message;
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
