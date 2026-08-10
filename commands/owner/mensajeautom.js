const OWNER_NUMBER = '12602764655'

function isOwner(jid = '') {
  const number = jid.split('@')[0].split(':')[0]
  return number === OWNER_NUMBER
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default {
  command: ['infoatodos'],
  category: 'owner',

  run: async ({ client, m, text }) => {
    if (!isOwner(m.sender)) {
      return m.reply('✘ Este comando solo puede usarlo el creador del bot.')
    }

    if (!text?.trim()) {
      return m.reply('✐ Escribe el mensaje que quieres enviar a todos los grupos.\n\n› Ejemplo: *#infoatodos Hola, ¿cómo están?*')
    }

    let groups
    try {
      groups = await client.groupFetchAllParticipating()
    } catch (e) {
      console.log('[infoatodos] error obteniendo grupos:', e.message)
      return m.reply('✘ No se pudo obtener la lista de grupos.')
    }

    const groupIds = Object.keys(groups)

    if (!groupIds.length) {
      return m.reply('✘ El bot no está en ningún grupo.')
    }

    await m.reply(`✐ Enviando mensaje a *${groupIds.length}* grupos, espera...`)

    let sent = 0
    let failed = 0

    for (const groupId of groupIds) {
      try {
        const group = groups[groupId]
        const participants = (group.participants || []).map((p) => p.id)

        const caption = `✿ Mensaje automático ✿\n\n${text}`

        await client.sendMessage(
          groupId,
          {
            text: caption,
            mentions: participants,
          }
        )

        sent++
      } catch (e) {
        console.log(`[infoatodos] falló en ${groupId}:`, e.message)
        failed++
      }

      // Pausa entre envíos para no saturar / evitar baneo por spam
      await sleep(2000)
    }

    await m.reply(`✔ Mensaje enviado a *${sent}* grupos.${failed ? `\n✘ Falló en *${failed}* grupos.` : ''}`)
  },
}
