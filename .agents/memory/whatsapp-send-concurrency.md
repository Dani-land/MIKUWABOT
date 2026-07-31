---
name: WhatsApp send concurrency
description: Reliability rule for outbound WhatsApp message handling.
---

Outbound WhatsApp sends must not share one global queue across chats, and every
queued send must resolve or reject its promise even after rate limits or
transport errors.

**Why:** A slow or rejected send in a large group can otherwise leave the
command handler pending, keep the bot stuck in “composing,” and block replies
in every other group.

**How to apply:** Scope send queues by destination JID, use bounded retries for
rate limits, and always clear presence in a `finally`-equivalent completion
path.