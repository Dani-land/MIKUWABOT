export default {
  command: ['ppt'],
  category: 'rpg',
  run: async ({client, m, text, usedPrefix, command}) => {

    if (globalThis.db.data.chats[m.chat].adminonly)
      return m.reply(`❒ Los comandos de *Economía* están desactivados en este grupo.\n\n> Un administrador puede activarlos usando:\n› *${usedPrefix}adminonly disable*`);

    if (!globalThis.db.data.chats[m.chat].rpg)
      return m.reply(`❒ La economía del grupo está en pausa.\n\n> Un administrador puede volver a activarla con:\n› *${usedPrefix}economia enable*`);

    let user = globalThis.db.data.chats[m.chat].users[m.sender]

    if (!user.pptCooldown) user.pptCooldown = 0

    let remainingTime = user.pptCooldown - Date.now()

    let botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    let botSettings = globalThis.db.data.settings[botId]

    let monedas = botSettings.currency

    if (remainingTime > 0) {
      return m.reply(`✦ Debes esperar *${msToTime(remainingTime)}* antes de volver a jugar.`);
    }

    const options = ['piedra', 'papel', 'tijera'];
    const userChoice = text.trim().toLowerCase();

    if (!options.includes(userChoice)) {
      return m.reply(`✦ Usa el comando así:\n> *${usedPrefix}${command} piedra*\n> *${usedPrefix}${command} papel*\n> *${usedPrefix}${command} tijera*`);
    }

    const botChoice = options[Math.floor(Math.random() * options.length)];

    const result = determineWinner(userChoice, botChoice);

    const randomReward = Math.floor(Math.random() * 3000);
    const randomExp = Math.floor(Math.random() * 1000);

    let randomLoss = Math.floor(Math.random() * 1000);

    const randomTieReward = Math.floor(Math.random() * 100);
    const randomTieExp = Math.floor(Math.random() * 100);

    if (result === '✦ ¡Ganaste!') {

      user.chocolates += randomReward;
      user.exp += randomExp;

      await client.reply(
        m.chat,
        `✦ ¡Victoria!\n\n> ✧ Elegiste › *${userChoice}*\n> ✧ El bot eligió › *${botChoice}*\n> ✧ ${monedas} ganadas › *¥${randomReward.toLocaleString()}*\n> ✧ Exp obtenida › *${randomExp}*\n\n${dev}`,
        m
      )

    } else if (result === '✦ Perdiste...') {

      if (user.chocolates >= randomLoss) {

        user.chocolates -= randomLoss;

      } else if (user.bank >= randomLoss) {

        user.bank -= randomLoss;

      } else {

        const total = user.chocolates + user.bank;

        if (total >= randomLoss) {

          const remaining = randomLoss - user.chocolates;

          user.chocolates = 0;
          user.bank -= remaining;

        } else {

          randomLoss = total;
          user.chocolates = 0;
          user.bank = 0;

        }
      }

      await client.reply(
        m.chat,
        `✦ Has perdido.\n\n> ✧ Elegiste › *${userChoice}*\n> ✧ El bot eligió › *${botChoice}*\n> ✧ ${monedas} perdidas › *-¥${randomLoss.toLocaleString()}*\n\n${dev}`,
        m
      )

    } else {

      user.chocolates += randomTieReward;
      user.exp += randomTieExp;

      await client.reply(
        m.chat,
        `✦ Empate.\n\n> ✧ Elegiste › *${userChoice}*\n> ✧ El bot eligió › *${botChoice}*\n> ✧ ${monedas} obtenidas › *+¥${randomTieReward.toLocaleString()}*\n> ✧ Exp obtenida › *+${randomTieExp}*\n\n${dev}`,
        m
      )
    }

    user.pptCooldown = Date.now() + 10 * 60000

  }
};

function determineWinner(userChoice, botChoice) {

  if (userChoice === botChoice) {
    return '✦ Empate.';
  }

  if (
    (userChoice === 'piedra' && botChoice === 'tijera') ||
    (userChoice === 'papel' && botChoice === 'piedra') ||
    (userChoice === 'tijera' && botChoice === 'papel')
  ) {
    return '✦ ¡Ganaste!';
  } else {
    return '✦ Perdiste...';
  }
}

function msToTime(duration) {

  var seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? '0' + hours : hours;
  minutes = (minutes < 10) ? '0' + minutes : minutes;
  seconds = (seconds < 10) ? '0' + seconds : seconds;

  if (minutes === '00') {
    return `${seconds} segundo${seconds > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`;
  }
}