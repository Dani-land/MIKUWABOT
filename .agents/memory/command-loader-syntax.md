---
name: Command loader syntax compatibility
description: Syntax constraint for dynamically loaded command and event modules.
---

Files loaded through the command loader must use syntax accepted by its parser,
not only syntax accepted by the installed Node runtime.

**Why:** The loader's syntax checker can reject newer logical-assignment
operators even when `node --check` succeeds, preventing an event module from
loading and causing repeated runtime errors.

**How to apply:** When editing dynamically imported command/event files, run the
same `syntax-error` validation used by `lib/system/commandLoader.js` and prefer
explicit conditionals for compatibility.