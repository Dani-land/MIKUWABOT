---
name: WhatsApp LID identity
description: Regla durable para identificar usuarios y bots cuando WhatsApp entrega LID en vez de número telefónico.
---

Las comprobaciones de identidad deben resolver primero los LID usando `client.signalRepository.lidMapping.getPNForLID` cuando esté disponible, con metadata del grupo como fallback. Después deben comparar JIDs normalizados, quitando el sufijo de dispositivo.

**Why:** WhatsApp moderno puede representar al mismo remitente como LID, número telefónico o JID con dispositivo. Comparar cadenas directamente hace que el creador parezca no autorizado y que `setprimary` rechace sockets válidos.

**How to apply:** Usa la normalización compartida para propietarios, administradores, participantes, bots primarios y sockets; no añadas comparaciones directas nuevas contra `m.sender` o `primaryBot`.