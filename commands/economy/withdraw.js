export default {
  command: ['withdraw', 'with'],
  category: 'rpg',
  run: async ({client, m, args}) => {
    const db = global.db.data
    const chatId = m.chat
    const senderId = m.sender
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId]
    const chatData = db.chats[chatId]

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✦ Los comandos de economía están desactivados en este grupo.`)

    const user = chatData.users[m.sender]
    const currency = botSettings.currency || 'Monedas'

    if (!args[0])
      return m.reply(
        `✦ Debes ingresar la cantidad que deseas retirar del banco.\n\n📌 Ejemplo:\n> *${global.prefa || '!'}withdraw 500*\n> *${global.prefa || '!'}withdraw all*`
      )

    if (args[0].toLowerCase() === 'all') {
      if ((user.bank || 0) <= 0)
        return m.reply(`🏦 No tienes fondos guardados en tu banco.`)

      const amount = user.bank

      user.bank = 0
      user.coins = (user.coins || 0) + amount

      return m.reply(
        `╭─〔 💰 RETIRO COMPLETADO 〕─╮

✦ Retiraste todos tus ahorros.

> +¥${amount.toLocaleString()} ${currency}

🏦 Tu cuenta bancaria quedó vacía.

╰────────────────╯`
      )
    }

    const count = parseInt(args[0])

    if (isNaN(count) || count < 1)
      return m.reply(`✦ Ingresa una cantidad válida para retirar.`)

    if ((user.bank || 0) < count)
      return m.reply(
        `🏦 Fondos insuficientes.\n\n✦ No tienes suficiente dinero en el banco para retirar *¥${count.toLocaleString()} ${currency}*.`
      )

    user.bank -= count
    user.coins = (user.coins || 0) + count

    await m.reply(
      `╭─〔 💸 RETIRO EXITOSO 〕─╮

✦ Dinero retirado del banco.

> +¥${count.toLocaleString()} ${currency}

💳 El dinero fue añadido a tu cartera.

╰────────────────╯`
    )
  },
};