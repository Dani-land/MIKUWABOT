import fetch from 'node-fetch'

const NYX_BASE = 'https://nyxdlapi.vercel.app'
const NYX_TT_URL = `${NYX_BASE}/api/downloads/tiktok`

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
      const apiUrl = `${NYX_TT_URL}?url=${encodeURIComponent(url)}`
      const res = await fetch(apiUrl)
      const text = await res.text()

      if (!res.ok) {
        throw new Error(`NyxDLaPI HTTP ${res.status}: ${text.slice(0, 200)}`)
      }

      let json
      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Respuesta inválida de NyxDLaPI: ${text.slice(0, 200)}`)
      }

      if (!json?.status) {
        throw new Error(json?.message || 'La API no devolvió un resultado válido.')
      }

      const result = json?.result

      // preferimos la versión sin marca de agua; si no viene, usamos la normal
      const videoUrl = result?.downloadNoWatermark || result?.download

      if (!result || !videoUrl) {
        return m.reply('ꕥ No se pudo obtener el video. Verifica que el enlace sea público.')
      }

      const caption = `✰ TikTok ✰

⌗ Usuario: ${result.author || result.username || 'Desconocido'}
⌗ Descripción: ${result.title || 'Sin descripción'}
⌗ Canción: ${result.musicTitle || 'N/A'}${result.musicArtist ? ` - ${result.musicArtist}` : ''}

⌗ Api: ${NYX_BASE}`

      await client.sendMessage(
        m.chat,
        {
          video: { url: videoUrl },
          caption,
        },
        { quoted: m }
      )
    } catch (e) {
      console.log('[tiktok]', e.message)
      await m.reply('ꕥ El servicio no está disponible en este momento.')
    }
  },
}