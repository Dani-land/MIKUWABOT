import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['steal', 'rob', 'robar'],
  category: 'rpg',

  run: async ({ client, m }) => {
    const db = global.db.data
    const chatId = m.chat

    const botId =
      client.user.id.split(':')[0] + '@s.whatsapp.net'

    const botSettings = db.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'

    const chatData = db.chats[chatId]

    if (chatData.adminonly || !chatData.rpg) {
      return m.reply(
        `✎ Estos comandos están desactivados en este grupo.`
      )
    }

    const mentioned = m.mentionedJid || []

    const who2 =
      mentioned[0] ||
      (m.quoted ? m.quoted.sender : null)

    if (!who2) {
      return m.reply(
        `《✧》 Debes mencionar a quien quieras robarle *${monedas}*.`
      )
    }

    const target = await resolveLidToRealJid(
      who2,
      client,
      chatId
    )

    if (!target) {
      return m.reply(
        `《✧》 No se pudo obtener el usuario correctamente.`
      )
    }

    if (target === m.sender) {
      return m.reply(
        `《✧》 No puedes robarte a ti mismo.`
      )
    }

    const senderData = chatData.users[m.sender]
    const targetData = chatData.users[target]

    if (!senderData) {
      return m.reply(
        `《✧》 No estás registrado en la economía del grupo.`
      )
    }

    if (!targetData) {
      return m.reply(
        `《✧》 El usuario mencionado no está registrado en el bot.`
      )
    }

    if (!senderData.roboCooldown) {
      senderData.roboCooldown = 0
    }

    const remainingTime =
      senderData.roboCooldown - Date.now()

    if (remainingTime > 0) {
      return m.reply(
        `ꕥ Debes esperar *${msToTime(
          remainingTime
        )}* antes de intentar robar nuevamente.`
      )
    }

    if (targetData.coins < 50) {
      return m.reply(
        `《✧》 *${
          db.users[target]?.name ||
          target.split('@')[0]
        }* no tiene suficiente *${monedas}* para robarle.`
      )
    }

    const cooldown = 30 * 60 * 1000
    const now = Date.now()

    senderData.roboCooldown = now + cooldown

    const success = Math.random() < 0.70

    if (!success) {
      const fine = Math.max(
        50,
        Math.floor(senderData.coins * 0.15)
      )

      senderData.coins = Math.max(
        0,
        senderData.coins - fine
      )

      senderData.roboCooldown =
        now + cooldown * 2

      return client.sendMessage(
        chatId,
        {
          text:
            `🚔 *FBI OPEN UP!*\n\n` +
            `ꕥ *@${m.sender.split('@')[0]}* intentó robar a *${
              db.users[target]?.name ||
              target.split('@')[0]
            }* pero fue atrapado.\n\n` +
            `💸 Multa: *-${fine.toLocaleString()} ${monedas}*`,
          mentions: [m.sender, target]
        },
        { quoted: m }
      )
    }

    const cantidadRobada = Math.min(
      Math.floor(Math.random() * 5000) + 50,
      targetData.coins
    )

    senderData.coins += cantidadRobada
    targetData.coins -= cantidadRobada

    await client.sendMessage(
      chatId,
      {
        text:
          `🕶️ *ROBO EXITOSO*\n\n` +
          `ꕥ Le robaste *${cantidadRobada.toLocaleString()} ${monedas}* a *${
            db.users[target]?.name ||
            target.split('@')[0]
          }*.`,
        mentions: [target]
      },
      { quoted: m }
    )
  }
}

function msToTime(duration) {
  const seconds = Math.floor(
    (duration / 1000) % 60
  )

  const minutes = Math.floor(
    (duration / (1000 * 60)) % 60
  )

  return `${minutes} minuto${
    minutes !== 1 ? 's' : ''
  }, ${seconds} segundo${
    seconds !== 1 ? 's' : ''
  }`
}