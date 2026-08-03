import { startSubBot } from '../../lib/subs.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

let commandFlags = {};

export default {
  command: ['code'],
  category: 'socket',

  run: async ({client, m, args, command, usedPrefix}) => {
    if (!args[0]) {
      return client.reply(
        m.chat,
`✦ Debes escribir tu número de teléfono junto con el comando.

✎ Uso: *${usedPrefix || '.'}code [tu número]*
> Ejemplo: *${usedPrefix || '.'}code 5219876543210*

✎ Nota: escribe tu número completo con código de país, sin espacios ni símbolos.`,
        m,
      );
    }

    let time = global.db.data.users[m.sender].Subs + 120000 || '';

    if (new Date() - global.db.data.users[m.sender].Subs < 120000) {
      return client.reply(
        m.chat,
        `✦ Debes esperar *${msToTime(time - new Date())}* para volver a vincular un socket.`,
        m,
      );
    }

    const subsPath = path.join(dirname, '../../Sessions/Subs');

    const subsCount = fs.existsSync(subsPath)
      ? fs.readdirSync(subsPath).filter((dir) => {
          const credsPath = path.join(subsPath, dir, 'creds.json');
          return fs.existsSync(credsPath);
        }).length
      : 0;

    const maxSubs = 20;

    if (subsCount >= maxSubs) {
      return client.reply(
        m.chat,
`✦ No hay espacios disponibles para registrar más Sub-Bots.

✎ Límite actual:
> ${maxSubs} sockets`,
        m,
      );
    }

    commandFlags[m.sender] = true;

    // ── Normaliza el número para que WhatsApp lo acepte ──────────────────────
    // - Elimina ceros iniciales
    // - Colombia: agrega 57 a números de 10 dígitos que empiezan con 3
    // - México: asegura prefijo 521 (no solo 52) para móviles
    // - Argentina: asegura prefijo 549 para móviles
    function normalizePhone(s) {
      if (!s) return ''
      if (s.startsWith('0')) s = s.replace(/^0+/, '')
      if (s.length === 10 && s.startsWith('3')) s = '57' + s
      if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2)
      if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2)
      return s
    }

    const rawPhone = args[0].replace(/\D/g, '')

    if (!rawPhone || rawPhone.length < 7) {
      return client.reply(
        m.chat,
`✦ Ese número no parece válido.

✎ Uso: *${usedPrefix || '.'}code [tu número]*
> Ejemplo: *${usedPrefix || '.'}code 5219876543210*`,
        m,
      )
    }

    const phone = normalizePhone(rawPhone);

    const rtx =
`✦ Vincula tu cuenta usando el código de conexión.

✐ Sigue estos pasos:
> • Abre los 3 puntos de WhatsApp
> • Entra a "Dispositivos vinculados"
> • Pulsa "Vincular dispositivo"
> • Selecciona "Vincular con número"

✎ Importante:
> El código solo funcionará con el número que lo solicitó.`;

    const isCode = /^(code)$/.test(command);
    const isCommand = isCode ? true : false;

    const caption = rtx;

    await startSubBot(
      m,
      client,
      caption,
      isCode,
      phone,
      m.chat,
      commandFlags,
      isCommand
    );

    global.db.data.users[m.sender].Subs = new Date() * 1;
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes > 0 ? minutes : '';
  seconds = seconds < 10 && minutes > 0 ? '0' + seconds : seconds;

  if (minutes) {
    return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`;
  } else {
    return `${seconds} segundo${seconds > 1 ? 's' : ''}`;
  }
}
