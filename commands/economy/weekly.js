const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

const msToTime = (duration) => {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))

  const pad = (n) => n.toString().padStart(2, '0')
  return `${days} d • ${pad(hours)} h • ${pad(minutes)} m • ${pad(seconds)} s`
}

export default {
  command: ['weekly', 'semanal'],
  category: 'rpg',
  run: async ({client, m}) => {
    const db = global.db.data
    const chatId = m.chat
    const senderId = m.sender
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId]
    const chatData = db.chats[chatId]

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✦ Los comandos de economía están desactivados en este grupo.`)

    const user = chatData.users[m.sender]
    const cooldown = 7 * 24 * 60 * 60 * 1000
    const lastClaim = user.lastWeekly || 0
    const timeLeft = msToTime(cooldown - (Date.now() - lastClaim))

    if (Date.now() - lastClaim < cooldown)
      return client.sendMessage(
        chatId,
        {
          text: `⌛ Ya reclamaste tu recompensa semanal.\n\n✦ Vuelve en:\n> *${timeLeft}*`
        },
        { quoted: m },
      )

    user.lastWeekly = Date.now()

    const coins = pickRandom([50, 100, 150, 200, 250])
    const exp = Math.floor(Math.random() * 1000)
    const currency = botSettings.currency || 'Monedas'

    const message = `╭─〔 ✦ RECOMPENSA SEMANAL ✦ 〕─╮

✰ Experiencia obtenida
> +${exp} Exp

✦ Recompensa económica
> +${coins} ${currency}

🎁 Gracias por reclamar tu bono semanal.

╰────────────────╯

${dev}`.trim()

    await client.sendMessage(
      chatId,
      {
        text: message,
        mentions: [senderId],
      },
      { quoted: m },
    )

    user.exp += exp
    user.coins = (user.coins || 0) + coins
  },
};