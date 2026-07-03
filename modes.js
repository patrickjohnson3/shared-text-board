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
  syncModeUI();
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
