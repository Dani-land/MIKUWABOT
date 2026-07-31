# Miku Wabot

## Overview

Miku Wabot is a Node.js WhatsApp multi-device bot built with Baileys. Its entry
point is `index.js`; commands live under `commands/`.

## Run on Replit

1. Install dependencies with `npm install`.
2. Set `global.number_bot` in `settings.js` when using the non-interactive
   pairing-code flow, or run in an interactive terminal to choose QR/pairing.
3. Start with `npm start`.
4. On first login, scan the displayed QR or enter the pairing code from
   WhatsApp's linked-devices screen. The resulting session is stored under
   `Sessions/Owner`.

The bot is a console/background service, not a web app, so it does not expose a
preview page. External downloader/API features also depend on their providers
being available.

## User preferences

- Keep the existing Baileys/Node.js structure; avoid migrations or broad
  refactors unless explicitly requested.