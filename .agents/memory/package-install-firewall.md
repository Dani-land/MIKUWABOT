---
name: Package installation firewall
description: Imported Node projects may fail dependency installation when a transitive native-build package is blocked by Replit security policy.
---

Imported Node projects can be blocked during dependency installation by the package firewall even when the application code is valid; treat the firewall failure separately from application diagnosis.

**Why:** The bot's dependency install was stopped by a blocked `tar` archive, while the project also declares a newer Node engine than the configured runtime.

**How to apply:** Report the blocked install and runtime mismatch explicitly, avoid bypassing the firewall, and use static checks when a live run cannot be started.