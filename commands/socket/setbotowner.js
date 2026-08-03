import { resolveLidToRealJid, isSocketOwner } from "../../lib/utils.js"

export default {
  command: ['setbotowner'],
  category: 'socket',

  run: async ({client, m, args}) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]

    if (!isSocketOwner(client, m, config)) {
      return m.reply(mess.socket)
    }

    const mentioned = m.mentionedJid

    const who2 = mentioned.length > 0
      ? mentioned[0]
      : (m.quoted ? m.quoted.sender : false)

    const who = await resolveLidToRealJid(who2, client, m.chat)

    const menti = client.user.id.split(':')[0] + "@s.whatsapp.net"

    if (!who2) {
      return client.reply(
        m.chat,
`✦ Debes mencionar al nuevo dueño del bot.

✧ Ejemplo:
> ${prefa}setbotowner @${menti.split('@')[0]}`,
        m,
        { mentions: [menti] }
      )
    }

    const anteriorOwner = config.owner
    const esCambio = anteriorOwner && anteriorOwner.endsWith('@s.whatsapp.net')

    config.owner = who

    const mensaje = esCambio
      ? `✐ El dueño del bot fue cambiado.\n\n❍ Anterior › @${anteriorOwner.split('@')[0]}\n❍ Nuevo › @${who.split('@')[0]}`
      : `✐ Nuevo dueño establecido correctamente.\n\n❍ Owner › @${who.split('@')[0]}`

    return client.reply(
      m.chat,
      mensaje,
      m,
      {
        mentions: esCambio
          ? [anteriorOwner, who]
          : [who]
      }
    )
  },
};