let proposals = {}

import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['marry'],
  category: 'rpg',

  run: async ({ client, m, args }) => {

    const db = global.db.data

    const chatId = m.chat

    const proposer = m.sender

    const mentioned = m.mentionedJid

    const who2 = mentioned.length > 0
      ? mentioned[0]
      : (m.quoted ? m.quoted.sender : false)

    const proposee = await resolveLidToRealJid(
      who2,
      client,
      m.chat
    )

    if (!who2) {

      return m.reply(
        '✦ Menciona al usuario con quien deseas casarte.'
      )
    }

    if (proposer === proposee) {

      return m.reply(
        '✦ No puedes enviarte una propuesta a ti mismo.'
      )
    }

    if (db.users[proposer]?.marry) {

      return m.reply(
        `✦ Ya estás casado con *${db.users[db.users[proposer].marry]?.name || 'alguien'}*.`
      )
    }

    if (db.users[proposee]?.marry) {

      return m.reply(
        `✦ *${db.users[proposee].name || proposee.split('@')[0]}* ya tiene una pareja registrada.`
      )
    }

    setTimeout(() => {

      delete proposals[proposer]

    }, 120000)

    if (proposals[proposee] === proposer) {

      delete proposals[proposee]

      db.users[proposer].marry = proposee

      db.users[proposee].marry = proposer

      return m.reply(
        `╭━〔 ✦ MATRIMONIO ✦ 〕━⬣
┃ ✧ Ahora:
┃ *${db.users[proposer].name || proposer.split('@')[0]}*
┃ y
┃ *${db.users[proposee].name || proposee.split('@')[0]}*
┃
┃ ✧ Han unido sus vidas
┃ oficialmente en el bot.
╰━━━━━━━━━━━━⬣`
      )

    } else {

      proposals[proposer] = proposee

      return client.sendMessage(
        chatId,
        {
          text: `╭━〔 ✦ PROPUESTA ✦ 〕━⬣
┃ ✧ @${proposee.split('@')[0]}
┃
┃ El usuario
┃ @${proposer.split('@')[0]}
┃ quiere casarse contigo.
┃
┃ ✧ Para aceptar:
┃ .marry @${proposer.split('@')[0]}
┃
┃ ✧ Tiempo límite:
┃ 2 minutos
╰━━━━━━━━━━━━⬣`,
          mentions: [proposer, proposee]
        },
        { quoted: m }
      )
    }
  }
};