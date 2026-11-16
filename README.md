# Farkle Scorekkeper

A responsive, installable Farkle scorekeeper PWA. No ads, accounts, backend, or paid services are required for the app itself.

## Run locally

For service-worker/offline testing, serve this folder over HTTP (not by double-clicking `index.html`).
For example, with Python installed:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Install

* iPhone/iPad: open the hosted HTTPS URL in Safari, tap Share, then Add to Home Screen.
* Desktop: use the browser's install option if available.

## Publish

Upload the contents of this folder to a Cloudflare Pages project as a static site. No build command is needed; the output directory is the project root.

## Current scoring behavior

* Scores are entered manually using the keypad.
* `+` banks the current entry into a pending hot-dice stack and clears the entry for the next roll.
* Bank adds the pending stack and current entry to the player's total.
* Banked turn totals must end in 00 or 50.
* Farkle discards the entire pending stack and current entry.
* Undo reverses the last score-entry, stack, bank, or Farkle action.
* Game state is saved locally in the browser on that device.

