import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['givecoins', 'pay', 'coinsgive'],
  category: 'rpg',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId]
    const monedas = botSettings.currency || 'coins'
    const chatData = db.chats[chatId]

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`〔✦〕 Los comandos RPG se encuentran desactivados en este grupo.`)

    const [cantidadInputRaw, ...rest] = args
    const mentioned = m.mentionedJid || []
    const who2 = mentioned[0] || args.find(arg => arg.includes('@s.whatsapp.net'))
    const who = await resolveLidToRealJid(who2, client, m.chat);

    if (!who2)
      return m.reply(`〔✦〕 Debes mencionar al usuario al que deseas enviar *${monedas}*.`)

    const senderData = chatData.users[m.sender]
    const targetData = chatData.users[who]

    if (!targetData)
      return m.reply(`〔✦〕 El usuario mencionado aún no se encuentra registrado en el sistema.`)

    const cantidadInput = cantidadInputRaw?.toLowerCase()

    const cantidad = cantidadInput === 'all'
      ? senderData.coins
      : parseInt(cantidadInput)

    if (!cantidadInput || isNaN(cantidad) || cantidad <= 0)
      return m.reply(`〔✦〕 Ingresa una cantidad válida de *${monedas}* para realizar la transferencia.`)

    if (senderData.coins < cantidad)
      return m.reply(`〔✦〕 No cuentas con suficientes *${monedas}* para completar esta transferencia.`)

    senderData.coins -= cantidad
    targetData.coins += cantidad

    try {

      const cantidadFormatted = cantidad.toLocaleString()

      const textoTransferencia = `✦ ${cantidadFormatted} ${monedas}`

      await client.sendMessage(
        chatId,
        {
          text: `╭─〔 Transferencia Exitosa 〕─⬣
│
├ Usuario:
│ ✦ *@${who.split('@')[0]}*
│
├ Cantidad:
│ ✦ ${textoTransferencia}
│
╰────────────⬣`,
          mentions: [who],
        },
        { quoted: m }
      )

    } catch (e) {

      await m.reply(`〔✦〕 Ocurrió un error al enviar la confirmación de transferencia.`)

    }
  }
};