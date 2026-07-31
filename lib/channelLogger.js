const CHANNEL_JID = '120363420575743790@newsletter'

const symbols = ['✿', '❀', '✦', '✧']

function getSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

/**
 * Llamar esto justo después de ejecutar CUALQUIER comando, tanto si salió bien
 * como si tronó. No hace nada si el log del canal está apagado para este bot.
 *
 * @param {object} params
 * @param {object} params.client - instancia del bot (la misma de siempre)
 * @param {string} params.botId  - JID del bot (para leer su configuración)
 * @param {string} params.user   - JID de quien mandó el comando (m.sender)
 * @param {string} params.chat   - JID del chat donde se usó (m.chat)
 * @param {string} params.command - nombre del comando usado
 * @param {boolean} params.success - true si el comando corrió sin tronar
 * @param {string} [params.errorMessage] - mensaje de error, si success es false
 */
export async function logCommandToChannel({ client, botId, user, chat, command, success, errorMessage }) {
  try {
    const botSettings = global.db?.data?.settings?.[botId]
    if (!botSettings?.canalLogs) return
    if (!CHANNEL_JID || CHANNEL_JID.includes('TU-ID-DE-CANAL-AQUI')) return

    const isGroup = chat?.endsWith('@g.us')
    const resultado = success ? '✅ True' : '❌ Error'

    const lines = [
      `${getSymbol()} *Registro de comando* ${getSymbol()}`,
      '',
      `⌗» Usuario › @${user?.split('@')[0] || 'Desconocido'}`,
      `⌗» Comando usado › *${command}*`,
      `⌗» Chat › ${isGroup ? 'Grupo' : 'Privado'}`,
      `⌗» Respuesta del bot › ${resultado}`,
    ]

    if (!success && errorMessage) {
      lines.push(`⌗» Detalle › ${errorMessage}`)
    }

    await client.sendMessage(CHANNEL_JID, {
      text: lines.join('\n'),
      mentions: user ? [user] : undefined,
    })
  } catch (e) {
    console.log('[canal-logger] no se pudo enviar al canal:', e.message)
  }
}
