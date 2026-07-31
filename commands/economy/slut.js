export default {
  command: ['slut'],
  category: 'rpg',
  run: async ({ client, m, groupMetadata }) => {
    try {
      if (!m.isGroup)
        return client.reply(m.chat, '❌ Este comando solo funciona en grupos.', m)

      async function getGroupParticipants(client, m, groupMetadata) {
        if (groupMetadata?.participants?.length) {
          return groupMetadata.participants
        }

        try {
          const meta = await client.groupMetadata(m.chat)
          if (meta?.participants?.length) {
            return meta.participants
          }
        } catch {}

        if (m?.participants?.length) {
          return m.participants
        }

        return []
      }

      const participants = await getGroupParticipants(client, m, groupMetadata)

      if (!participants.length) {
        return client.reply(
          m.chat,
          '⚠️ No pude obtener los participantes del grupo en este momento.\nIntenta de nuevo en unos segundos.',
          m
        )
      }

      let botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      let botSettings = global.db.data.settings[botId] || {}
      let currency = botSettings.currency || 'Coins'

      if (!global.db.data.chats[m.chat]) {
        global.db.data.chats[m.chat] = { users: {} }
      }

      if (!global.db.data.chats[m.chat].users[m.sender]) {
        global.db.data.chats[m.chat].users[m.sender] = {
          exp: 0,
          coins: 0,
          logros: { prostituirse: 0 },
          lastProsti: 0
        }
      }

      let user = global.db.data.chats[m.chat].users[m.sender]

      if (!user.logros) user.logros = {}
      if (typeof user.logros.prostituirse !== 'number') {
        user.logros.prostituirse = 0
      }

      let cooldown = 10 * 60 * 1000
      let tiempoRestante = user.lastProsti + cooldown - Date.now()

      if (tiempoRestante > 0) {
        const tiempo2 = segundosAHMS(Math.ceil(tiempoRestante / 1000))
        return client.reply(
          m.chat,
          `💋 Debes esperar ⏱️ *${tiempo2}* para volver a prostituirte.`,
          m
        )
      }

      user.lastProsti = Date.now()

      let participantes = participants
        .map(v => v.id || v.jid)
        .filter(id => id && id !== m.sender && id !== botId)

      if (participantes.length === 0) {
        return client.reply(
          m.chat,
          '💔 No hay clientes disponibles ahora mismo...',
          m
        )
      }

      let clienteId =
        participantes[Math.floor(Math.random() * participantes.length)]

      let clienteTag = toM(clienteId)

      let exito = Math.random() < 0.7

      if (exito) {
        let xpGanado =
          Math.floor(Math.random() * (5000 - 500 + 1)) + 500

        let dulcesGanados =
          Math.floor(Math.random() * (5000 - 5 + 1)) + 5

        let texto = pickRandom(aventurasExito)
          .replace('{cliente}', clienteTag)
          .replace('{currency}', currency)

        user.exp += xpGanado
        user.coins += dulcesGanados
        user.logros.prostituirse += 1

        return client.reply(
          m.chat,
          `💄 ${texto}\n\n✨ Ganaste *${toNum(xpGanado)} XP* y *${dulcesGanados} ${currency}*.`,
          m,
          { mentions: [clienteId] }
        )
      } else {
        let xpPerdido =
          Math.floor(Math.random() * (4000 - 200 + 1)) + 200

        let dulcesPerdidos =
          Math.floor(Math.random() * (4000 - 2 + 1)) + 2

        let texto = pickRandom(aventurasFracaso)
          .replace('{cliente}', clienteTag)
          .replace('{currency}', currency)

        user.exp = Math.max(0, user.exp - xpPerdido)
        user.coins = Math.max(0, user.coins - dulcesPerdidos)

        return client.reply(
          m.chat,
          `💔 ${texto}\n\n❌ Perdiste *${toNum(xpPerdido)} XP* y *${dulcesPerdidos} ${currency}*.`,
          m,
          { mentions: [clienteId] }
        )
      }
    } catch (error) {
      m.reply(`Error:\n${error.message}\n${error?.stack || error}`)
    }
  }
}

function toM(a) {
  return '@' + a.split('@')[0]
}

function toNum(number) {
  if (number >= 1000 && number < 1000000)
    return (number / 1000).toFixed(1) + 'k'

  if (number >= 1000000)
    return (number / 1000000).toFixed(1) + 'M'

  if (number <= -1000 && number > -1000000)
    return (number / 1000).toFixed(1) + 'k'

  if (number <= -1000000)
    return (number / 1000000).toFixed(1) + 'M'

  return number.toString()
}

function segundosAHMS(segundos) {
  let minutos = Math.floor((segundos % 3600) / 60)
  let segundosRestantes = segundos % 60

  return `${minutos} minutos y ${segundosRestantes} segundos`
}

function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())]
}

const aventurasExito = [
  "Pasaste una noche inolvidable con {cliente}",
  "{cliente} quedó fascinado con tu actuación",
  "La noche con {cliente} fue un éxito rotundo",
  "Fuiste la sensación para {cliente}, quien te recomendó a todos",
  "{cliente} te contrató para toda la noche y te pagó muy bien",
  "{cliente} quedó impresionado por tu carisma y te dio una propina generosa",
  "Organizaste un evento épico con {cliente} que todos recordarán",
  "{cliente} te pidió que volvieras porque fue una experiencia increíble",
  "Tu encanto deslumbró a {cliente}, quien no paró de alabarte",
  "{cliente} te premió con un cofre lleno de tesoros por tu talento",
  "Hiciste un trato perfecto con {cliente} y ambos salieron ganando",
  "{cliente} te nombró la estrella de la noche por tu gran desempeño",
  "Tu aventura con {cliente} fue tan buena que te ganaste su lealtad",
  "{cliente} quedó tan encantado que te pagó el doble por tus servicios",
  "Tuviste una noche salvaje con {cliente} y te llenó de billetes",
  "{cliente} no pudo resistirse a tu encanto y te dio una fortuna",
  "Hiciste un show inolvidable para {cliente} y te bañaron en {currency}",
  "{cliente} te pidió que volvieras mañana con una bolsa llena de XP",
  "Tu noche con {cliente} fue tan intensa que te dieron un bono extra",
  "{cliente} gritó tu nombre toda la noche y te dejó un montón de {currency}",
  "Lograste seducir a {cliente} y te llevaste todo su dinero"
]

const aventurasFracaso = [
  "{cliente} te miró, pero se fue sin pagar",
  "{cliente} se asustó y salió corriendo",
  "Pasaste horas esperando a {cliente}, pero no llegó",
  "{cliente} te confundió con otra persona y no te pagó",
  "{cliente} te hizo perder el tiempo y encima te robó {currency}",
  "{cliente} canceló el trato en el último momento y te dejó sin nada",
  "Intentaste impresionar a {cliente}, pero se rió y se fue",
  "{cliente} dijo que no estaba interesado y te dejó plantado",
  "Un malentendido con {cliente} hizo que perdieras tu oportunidad",
  "{cliente} te prometió una gran recompensa, pero era una estafa",
  "Tu plan con {cliente} salió mal y terminaste perdiendo recursos",
  "Intentaste negociar con {cliente}, pero no lograste convencerlo",
  "{cliente} te ignoró completamente y se fue con alguien más",
  "{cliente} te dejó plantado después de prometerte una noche inolvidable",
  "Intentaste conquistar a {cliente}, pero se rió en tu cara y se fue",
  "{cliente} te dio un billete falso y se escapó con tus {currency}",
  "Tu plan con {cliente} fue un desastre y te dejó sin un centavo",
  "{cliente} te rechazó diciendo que no eras su tipo y te robó XP",
  "Pasaste la noche con {cliente}, pero se fue sin dejar ni un dulce",
  "{cliente} te prometió una gran suma, pero te estafó y huyó",
  "Intentaste un movimiento atrevido con {cliente}, pero te dio un portazo"
]