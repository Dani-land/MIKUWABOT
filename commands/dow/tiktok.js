import fetch from 'node-fetch'

const TIKTOK_API = 'https://dlapixy.vercel.app/api/downloads/tiktok'

export default {
  command: ['tiktok', 'tt'],
  category: 'downloader',

  run: async ({ client, m, args }) => {
    if (!args.length || !args[0].includes('tiktok.com')) {
      return m.reply(
        `✎ Ingresa algún *URL* válido de TikTok.\n\nEjemplo: *#tiktok* https://vt.tiktok.com/...`
      )
    }

    const url = args[0]

    try {
      const apiUrl = `${TIKTOK_API}?url=${encodeURIComponent(url)}`
      const res = await fetch(apiUrl)
      const text = await res.text()

      if (!res.ok) {
        throw new Error(`DLaPixy HTTP ${res.status}: ${text.slice(0, 200)}`)
      }

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Respuesta inválida de DLaPixy: ${text.slice(0, 200)}`)
      }

      if (!json?.ok) {
        throw new Error('La API no devolvió un resultado válido.')
      }

      const files = json?.files || []

      const videoFile = files.find(
        file =>
          file?.kind === 'video' &&
          file?.format === 'mp4' &&
          file?.url
      )

      if (!videoFile?.url) {
        return m.reply(
          'ꕥ No se pudo obtener el video. Verifica que el enlace sea público.'
        )
      }

      const caption = `✰ TikTok ✰

⌗ 𝕋í𝕥𝕦𝕝𝕠: ${json.title || 'Sin título'}
⌗ ℙ𝕣𝕠𝕧𝕖𝕖𝕕𝕠𝕣: ${json.provider || 'TikTok'}
⌗ 𝔻𝕦𝕣𝕒𝕔𝕚ó𝕟: ${json.durationSeconds ? `${json.durationSeconds}s` : 'N/A'}

⌗ ᴀᴘɪ : DLaPixy`

      await client.sendMessage(
        m.chat,
        {
          video: { url: videoFile.url },
          caption,
        },
        { quoted: m }
      )

    } catch (e) {
      console.log('[tiktok]', e.message)

      await m.reply(
        'ꕥ El servicio no está disponible en este momento.'
      )
    }
  },
}