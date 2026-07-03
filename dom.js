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
