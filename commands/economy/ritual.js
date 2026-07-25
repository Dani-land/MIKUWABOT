export default {
  command: ['ritual'],
  category: 'rpg',
  run: async ({client, m}) => {

    const botId = client?.user?.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId]

    const monedas = botSettings?.currency || 'Coins'

    const chat = global.db.data.chats[m.chat]

    if (chat.adminonly || !chat.rpg)
      return m.reply(`✦ Los comandos de economía están desactivados en este grupo.`)

    const user = chat.users[m.sender]

    const remaining = user.ritualCooldown - Date.now()

    if (remaining > 0) {
      return m.reply(`✦ Debes esperar *${msToTime(remaining)}* para realizar otro ritual.`)
    }

    user.ritualCooldown = Date.now() + 15 * 60000

    const roll = Math.random()

    let reward = 0
    let narration = ''
    let bonusMsg = ''

    if (roll < 0.05) {

      reward = Math.floor(Math.random() * 100000) + 50000

      narration = '✦ Un espíritu ancestral apareció frente a ti y dejó un tesoro legendario.'

      bonusMsg = '\n✧ ¡Obtuviste una recompensa MÍTICA!'

    } else if (roll < 0.25) {

      reward = Math.floor(Math.random() * 10000) + 2000

      narration = '✦ El portal del ritual se abrió y expulsó riquezas del vacío.'

    } else if (roll < 0.75) {

      reward = Math.floor(Math.random() * 5000) + 500

      narration = `✦ La energía del ritual te bendijo con fortuna.`

    } else {

      const loss = Math.floor(Math.random() * 2000) + 500

      user.coins = Math.max(0, user.coins - loss)

      return m.reply(`✦ El ritual salió mal...\n\n> Perdiste *${loss.toLocaleString()} ${monedas}* por una maldición oscura.`)
    }

    if (Math.random() < 0.15) {

      const bonus = Math.floor(Math.random() * 4000) + 1000

      reward += bonus

      bonusMsg += `\n✧ Energía extra obtenida › *${bonus.toLocaleString()} ${monedas}*`
    }

    user.coins += reward

    let msg = `✦ ${narration}\n\n> Ganaste *${reward.toLocaleString()} ${monedas}*`

    if (bonusMsg) msg += `\n${bonusMsg}`

    await client.reply(m.chat, msg, m)
  },
};

function msToTime(duration) {

  let seconds = Math.floor((duration / 1000) % 60)

  let minutes = Math.floor((duration / (1000 * 60)) % 60)

  minutes = minutes < 10 ? '0' + minutes : minutes

  seconds = seconds < 10 ? '0' + seconds : seconds

  if (minutes === '00')
    return `${seconds} segundo${seconds > 1 ? 's' : ''}`

  return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`
}