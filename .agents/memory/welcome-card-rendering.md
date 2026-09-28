---
name: Welcome card rendering
description: Regla para mantener visibles los elementos base de las tarjetas de bienvenida cuando falla una foto remota.
---

La descarga o conversión de una foto de perfil es opcional: si falla, la tarjeta debe conservar la plantilla y renderizar el nombre igualmente, usando el icono predeterminado.

**Why:** Un error al procesar una imagen remota hacía que el flujo devolviera la plantilla original completa y ocultara también el nombre.

**How to apply:** En cualquier cambio futuro de la tarjeta, separa la composición del avatar de la capa de texto y prueba ambas rutas: foto válida y foto ausente o inválida.