import fetch from 'node-fetch'
import fs from 'fs'
import axios from 'axios'
import moment from 'moment-timezone'
import { commands } from '../../lib/commands.js'

export default {
  command: ['menu', 'help'],
  category: 'info',
  run: async ({client, m, text, args, usedPrefix}) => {
  try {
  
    const cmdsList = commands
    let now = new Date()

    let colombianTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/Bogota' })
    )

    let tiempo = colombianTime.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(/,/g, '')

    let tiempo2 = moment.tz('America/Bogota').format('hh:mm A')

    let plugins = commands.length

    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"

    let botSettings = global.db.data.settings[botId]

    let botname = botSettings.namebot
    let botname2 = botSettings.namebot2
    let banner = botSettings.banner

    const owner = botSettings.owner
    const canalId = botSettings.id
    const canalName = botSettings.nameid
    const link = botSettings.link

    let desar = "Oculto";

    if (owner && !isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))) {
      const userData = global.db.data.users[owner];
      desar = userData?.genre || "Oculto";
    }

    const jam = moment
      .tz('America/Bogota')
      .locale('id')
      .format('HH:mm:ss')

    const ucapan =
      jam < '05:00:00'
        ? 'Buen día'
        : jam < '11:00:00'
        ? 'Buen día'
        : jam < '15:00:00'
        ? 'Buenas tardes'
        : jam < '18:00:00'
        ? 'Buenas tardes'
        : jam < '23:59:00'
        ? 'Buenas noches'
        : 'Buenas noches';

    let menu = `\n\n`

    menu += `꒰ 🌸 ꒱ 𝐇𝐚𝐭𝐬𝐮𝐧𝐞 𝐌𝐢𝐤𝐮 𝐁𝐨𝐭\n`
    menu += `••••••••••••••••••••••••••••••••••\n`
    menu += `> ${ucapan} *${m.pushName ? m.pushName : 'Sin nombre'}*\n\n`

    menu += `୨୧ ───────────── ୨୧\n`
    menu += `✦ 𝐌𝐢𝐤𝐮 𝐖𝐚𝐛𝐨𝐭 ✦\n`
    menu += `୨୧ ───────────── ୨୧\n`

    menu += `✐ *${desar === 'Hombre'
      ? 'Creador'
      : desar === 'Mujer'
      ? 'Creadora'
      : 'Creador(a)'} ›* ${
        owner
          ? (!isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))
            ? `@${owner.split('@')[0]}`
            : owner)
          : "Oculto por privacidad"
      }\n`

    menu += `✐ *Plugins ›* ${plugins}\n`
    menu += `✐ *Versión ›* 3.0.0\n`
    menu += `✐ *Link ›* ${link}\n\n`

    menu += `✐ *Fecha ›* ${tiempo}, ${tiempo2}\n`
    menu += `✐ *Users ›* ${Object.keys(global.db.data.users).length.toLocaleString()}\n`

    menu += `୨୧ ───────────── ୨୧\n`

    const categoryArg = args[0]?.toLowerCase();
    const categories = {};

    for (const command of cmdsList) {
      const category = command.category || 'otros';

      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push(command);
    }

    if (categoryArg && !categories[categoryArg]) {
      return m.reply(
        `✘ La categoría *${categoryArg}* no fue encontrada.\n\n` +
        `✦ Categorías disponibles:\n` +
        `${Object.keys(categories).map(c => `• ${c}`).join('\n')}`
      );
    }

    for (const [category, cmds] of Object.entries(categories)) {

      if (categoryArg && category.toLowerCase() !== categoryArg) {
        continue;
      }

      const catName =
        category.charAt(0).toUpperCase() + category.slice(1)

      menu += `\n`
      menu += `╭─❀「 ${catName} 」\n`

      cmds.forEach(cmd => {

        const match = usedPrefix.match(/[#\/+.!-]$/);

        const separator = match ? match[0] : '';

        const cleanPrefix = separator ? separator : usedPrefix;

        const aliases = (cmd.alias || cmd.command || [])
          .map(a => {
            const aliasClean = a
              .split(/[\/#!+.\-]+/)
              .pop()
              .toLowerCase();

            return `${cleanPrefix}${aliasClean}`;
          })
          .join(' › ');

        menu += `│ ✦ *${aliases}* ${cmd.uso ? `+ ${cmd.uso}` : ''}\n`

        if (cmd.desc) {
          menu += `│ ◦ _${cmd.desc}_\n`
        }

        menu += `│\n`
      });

      menu += `╰────────────❀\n`
    }

    await client.sendMessage(
      m.chat,
      {
        image: { url: banner },
        caption: menu.trim(),
        contextInfo: {
          mentionedJid: [owner],
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: canalId,
            newsletterName: canalName,
            serverMessageId: -1,
          }
        }
      },
      { quoted: m }
    )

  } catch (e) {
    console.log(e)
    await m.reply(`${msgglobal + e}`)
  }
}}