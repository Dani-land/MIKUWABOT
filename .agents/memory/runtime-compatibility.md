---
name: Runtime compatibility
description: Runtime and native dependency constraints for this bot.
---

Native packages must be built for the exact Node runtime used by the workflow,
and dynamically loaded modules must only import exports that still exist.

**Why:** Switching runtimes can invalidate native SQLite binaries, while
removing an exported helper can crash startup before WhatsApp authentication.

**How to apply:** After runtime or dependency changes, verify native imports and
load the event/command modules before restarting the bot.