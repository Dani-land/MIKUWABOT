export default {
  command: ['rt', 'roulette', 'ruleta'],
  category: 'rpg',

  run: async ({client, m, text, usedPrefix, command}) => {

    if (globalThis.db.data.chats[m.chat].adminonly)
      return m.reply(`❒ Los comandos de *Economía* están desactivados en este grupo.\n\n> Un administrador puede activarlos usando:\n› *${usedPrefix}adminonly disable*`);

    if (!globalThis.db.data.chats[m.chat].rpg)
      return m.reply(`❒ La economía del grupo está en pausa.\n\n> Un administrador puede volver a activarla con:\n› *${usedPrefix}economia enable*.`);

    let user = globalThis.db.data.chats[m.chat].users[m.sender]

    if (!user.coins) user.coins = 0
    if (!user.rtCooldown) user.rtCooldown = 0

    let botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    let botSettings = global.db.data.settings[botId]

    let currency = botSettings.currency

    let remainingTime = user.rtCooldown - Date.now()

    if (remainingTime > 0) {
      return m.reply(`✦ Debes esperar *${msToTime(remainingTime)}* antes de volver a girar la ruleta.`)
    }

    const args = text.split(' ')

    if (args.length !== 2) {
      return m.reply(`✦ Debes ingresar una cantidad y un color.\n\n✧ Ejemplo:\n> *${usedPrefix + command} 200 black*`)
    }

    const amount = parseInt(args[0])
    const color = args[1].toLowerCase()

    if (isNaN(amount))
      return m.reply(`✦ Ingresa una cantidad válida de *${currency}*.`)

    if (amount < 200)
      return m.reply(`✦ La apuesta mínima es de *200 ${currency}*.`)

    if (amount > 10000)
      return m.reply(`✦ No puedes apostar más de *10,000 ${currency}* por ronda.`)

    if (!['red', 'black', 'green'].includes(color))
      return m.reply(`✦ Colores disponibles:\n\n🔴 red\n⚫ black\n🟢 green`)

    if (user.coins < amount)
      return m.reply(`✦ No tienes suficientes *${currency}* para apostar.`)

    const colors = [
      'red','red','red','red','red','red',
      'black','black','black','black','black','black',
      'green',
      'orange',
      'white'
    ]

    const resultColor = colors[Math.floor(Math.random() * colors.length)]

    user.rtCooldown = Date.now() + 10 * 60000

    const colorEmojis = {
      red: '🔴',
      black: '⚫',
      green: '🟢',
      orange: '🟠',
      white: '⚪'
    }

    if (resultColor === 'orange') {

      user.coins -= amount

      await client.reply(
        m.chat,
        `🎰 *RULETA ESPECIAL*\n\nLa bola cayó en ${colorEmojis[resultColor]} *${resultColor.toUpperCase()}*\n\n✦ Mala suerte... perdiste *${amount.toLocaleString()} ${currency}*`,
        m
      )

      return
    }

    if (resultColor === 'white') {

      let total = user.coins

      user.coins = 0

      await client.reply(
        m.chat,
        `🎰 *RULETA FATAL*\n\nLa bola cayó en ${colorEmojis[resultColor]} *${resultColor.toUpperCase()}*\n\n☠️ Has perdido todo tu dinero:\n> *${total.toLocaleString()} ${currency}*`,
        m
      )

      return
    }

    if (resultColor === color) {

      let reward = amount

      if (resultColor === 'green') {
        reward *= 14
      } else {
        reward *= 2
      }

      user.coins += reward

      await client.reply(
        m.chat,
        `🎰 *RULETA*\n\nLa bola cayó en ${colorEmojis[resultColor]} *${resultColor.toUpperCase()}*\n\n✦ ¡Felicidades!\nGanaste *${reward.toLocaleString()} ${currency}*`,
        m
      )

    } else {

      user.coins -= amount

      await client.reply(
        m.chat,
        `🎰 *RULETA*\n\nLa bola cayó en ${colorEmojis[resultColor]} *${resultColor.toUpperCase()}*\n\n✦ Perdiste *${amount.toLocaleString()} ${currency}*`,
        m
      )
    }
  }
}

function msToTime(duration) {

  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)

  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds

  if (minutes === '00') {
    return `${seconds} segundo${seconds > 1 ? 's' : ''}`
  } else {
    return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`
  }
}