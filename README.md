# shared-text-board

A single-page communication board for showing short text, numeric-looking text,
or a yes/no choice on one screen.

The app is intentionally local-only. "Shared" means showing the same screen to
someone nearby or over screen sharing; there is no account system, network sync,
database, or persistence.

## Use

Open `index.html` in a browser.

Modes:

- `abc`: free text
- `123`: numeric-looking text, kept as typed
- `yes/no`: large yes/no response buttons

Actions:

- `speak`: reads the current board text with the browser Web Speech API
- `clear`: clears the active mode

Desktop shortcuts:

- `Ctrl+Enter` or `Cmd+Enter`: speak
- `Ctrl+Backspace` or `Cmd+Backspace`: clear, except while typing in a text field

## Browser Notes

The app has no build step and no external dependencies. Speech output depends on
the browser's Web Speech API support and installed voices.
