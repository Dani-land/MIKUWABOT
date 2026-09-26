---
name: ImageMagick runtime
description: Entorno de procesamiento usado para composiciones de imágenes del bot.
---

Las composiciones de imágenes del bot deben preferir la herramienta ImageMagick disponible en el entorno en lugar de introducir otra dependencia npm nativa.

**Why:** La instalación de paquetes npm quedó bloqueada por la política de seguridad de una dependencia transitiva, mientras que ImageMagick ya está disponible en el runtime.

**How to apply:** Para nuevas tarjetas o overlays, usa comandos controlados mediante `execFile`, buffers temporales y limpieza garantizada de esos archivos.