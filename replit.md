# MikuWabot-MD

Bot de WhatsApp multifuncional construido con **Baileys** (Node.js).

## Stack
- **Runtime:** Node.js 22
- **Framework WhatsApp:** @whiskeysockets/baileys (fork: this-xys/baileys)
- **Base de datos:** better-sqlite3 (SQLite en `lib/datos.db`)
- **Entrada:** `node index.js`

## Cómo ejecutar
```
npm start
```

## Configuración inicial (importante)
Edita `settings.js` antes de iniciar:

```js
global.number_bot = '521XXXXXXXXXX'   // Tu número con código de país (sin + ni espacios)
global.pairing_code = true             // true = código de 8 dígitos, false = QR
global.owner = ['521XXXXXXXXXX']       // Tu número de owner
```

### Primera vez (sin sesión guardada)
1. Configura `global.number_bot` en `settings.js`
2. Ejecuta el bot → aparecerá un **código de 8 dígitos**
3. En WhatsApp: **Configuración → Dispositivos vinculados → Vincular dispositivo**
4. Ingresa el código de 8 dígitos

### Reiniciar sesión (nuevo QR/código)
```bash
rm -rf Sessions/Owner/*
npm start
```

## Estructura
```
index.js          ← Entrada principal (conexión WhatsApp)
main.js           ← Handler de mensajes
settings.js       ← Configuración global del bot
commands/         ← Comandos organizados por categoría
lib/
  system/         ← Base de datos, cargador de comandos, initDB
  message.js      ← Procesador de mensajes (smsg)
  utils.js        ← Utilidades
Sessions/Owner/   ← Credenciales de sesión WhatsApp (se genera al conectar)
```

## User preferences
- Mantener la estructura y stack existente del proyecto
