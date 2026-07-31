const CHANNEL_JID = '120363420575743790@newsletter'

/**
 * Llamar esto cuando un usuario vincula/crea un subbot con éxito.
 *
 * @param {object} params
 * @param {object} params.client
 * @param {string} params.botId
 * @param {string} params.user - JID del usuario que se convirtió en subbot
 * @param {string} [params.pushname]
 * @param {string} [params.subbotNumber] - número/JID del subbot creado, si es distinto al usuario
 */
export async function logNewSubbotToChannel({ client, botId, user, pushname, subbotNumber }) {
  try {
    const botSettings = global.db?.data?.settings?.[botId]
    if (!botSettings?.canalLogs) return
    if (!CHANNEL_JID || CHANNEL_JID.includes('TU-ID-DE-CANAL-AQUI')) return

    const lines = [
      `🤖 *Nuevo subbot vinculado* 🤖`,
      '',
      `⌗» Nombre › ${pushname || 'Sin nombre'}`,
      `⌗» Usuario › @${user?.split('@')[0] || 'Desconocido'}`,
    ]

    if (subbotNumber) lines.push(`⌗» Subbot › ${subbotNumber}`)
    lines.push(`⌗» Fecha › ${new Date().toLocaleString('es-MX')}`)

    await client.sendMessage(CHANNEL_JID, {
      text: lines.join('\n'),
      mentions: user ? [user] : undefined,
    })
  } catch (e) {
    console.log('[canal-logger] no se pudo enviar log de nuevo subbot:', e.message)
  }
}
