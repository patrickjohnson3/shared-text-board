const panelControlSelector = 'button, select, textarea, input, [tabindex]:not([tabindex="-1"])';

function getPanelControls() {
  return Array.from(elements.optionsPanel.querySelectorAll(panelControlSelector))
    .filter((control) => !control.hasAttribute('disabled'));
}

function setInert(element, isInert) {
  if (isInert) {
    element.setAttribute('inert', '');
  } else {
    element.removeAttribute('inert');
  }
}

function setPanelControlsEnabled(isEnabled) {
  setInert(elements.optionsPanel, !isEnabled);
  getPanelControls().forEach((control) => {
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
  syncModalAttributes(true);
  focusDefaultPanelControl();
}

function closeModal(options = {}) {
  const { restoreFocus = true } = options;
  syncModalAttributes(false);

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

function firstFocusable(controls) {
  return controls[0];
}

function lastFocusable(controls) {
  return controls[controls.length - 1];
}

function trapFocus(event, controls) {
  if (!controls.length) return;

  const firstControl = firstFocusable(controls);
  const lastControl = lastFocusable(controls);

  if (!controls.includes(document.activeElement)) {
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

function handlePanelTab(event) {
  if (event.key !== 'Tab' || !isPanelOpen()) return;

  trapFocus(event, getPanelControls());
}
