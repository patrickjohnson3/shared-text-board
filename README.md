# shared-text-board

A single-page communication board for showing short text, numeric-looking text,
or a yes/no choice on one screen.

The app is intentionally local-only. "Shared" means showing the same screen to
someone nearby or over screen sharing; there is no account system, network sync,
or database. Board content is not saved; the selected theme may be remembered by
the browser.

## Use

Open `index.html` in a browser.

Modes:

- `abc`: free text
- `123`: numeric-looking text, kept as typed
- `yes/no`: large yes/no response buttons

Actions:

- `speak`: reads the current board text with the browser Web Speech API
- `options`: opens a centered panel for theme and fullscreen controls
- `clear`: clears the active mode

Desktop shortcuts:

- `Ctrl+Enter` or `Cmd+Enter`: speak, except while typing in a text field
- `Ctrl+Backspace` or `Cmd+Backspace`: clear, except while typing in a text field
- `Ctrl+,` or `Cmd+,`: open options, except while typing in a text field

## Browser Notes

The app has no build step and no external dependencies. Speech output depends on
the browser's Web Speech API support and installed voices.

## Checks

Run the no-build checks with:

```sh
./check.sh
```
