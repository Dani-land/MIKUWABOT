const XD_AUDIO_URL = 'https://files.catbox.moe/h9at8f.mp3'

// Coincide con: xd, xdd, xddd, xdddd... (una o más "d" después de la x), sin importar mayúsculas
const XD_REGEX = /^xd+$/i

export async function all(m, { client }) {
  try {
    if (m.key?.fromMe) return
    if (!m.chat) return

    const text = (m.text || '').trim()

    if (!XD_REGEX.test(text)) return

    await client.sendMessage(
      m.chat,
      {
        audio: { url: XD_AUDIO_URL },
        mimetype: 'audio/mpeg',
        ptt: false,
      },
      { quoted: m }
    )
  } catch (err) {
    console.log('[xd-audio]', err.message)
  }
}
