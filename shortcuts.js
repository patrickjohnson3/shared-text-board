const shortcuts = [];

function registerCommandShortcut(key, action) {
  shortcuts.push({ key, action, ignoreTextFields: true });
}

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

registerCommandShortcut('enter', speak);
registerCommandShortcut('backspace', clearBoard);
registerCommandShortcut(',', openPanel);
