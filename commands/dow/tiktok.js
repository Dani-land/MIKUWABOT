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
        throw new Error(`DLaPixy HTTP ${res.status}: ${text.slice(0, 500)}`)
      }

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Respuesta inválida de DLaPixy: ${text.slice(0, 500)}`)
      }

      if (!json?.ok) {
        throw new Error(
          json?.message ||
          json?.error ||
          'La API no devolvió un resultado válido.'
        )
      }

      const files = Array.isArray(json?.files) ? json.files : []

      const caption = `✰ TikTok ✰

⌗ 𝕋í𝕥𝕦𝕝𝕠: ${json.title || 'Sin título'}
⌗ ℙ𝕣𝕠𝕧𝕖𝕖𝕕𝕠𝕣: ${json.provider || 'TikTok'}
⌗ 𝔻𝕦𝕣𝕒𝕔𝕚ó𝕟: ${json.durationSeconds ? `${json.durationSeconds}s` : 'N/A'}

⌗ ᴀᴘɪ : DLaPixy`

      if (json.mediaType === 'image') {
        let imageUrls = Array.isArray(json.imageUrls)
          ? json.imageUrls.filter(Boolean)
          : []

        if (!imageUrls.length) {
          imageUrls = files
            .filter(file => file?.kind === 'image' && file?.url)
            .map(file => file.url)
        }

        if (!imageUrls.length) {
          throw new Error(
            'La API indicó que es una publicación de imágenes, pero no devolvió ninguna imagen.'
          )
        }

        await client.sendMessage(
          m.chat,
          {
            album: imageUrls.map((imageUrl, index) => ({
              image: { url: imageUrl },
              caption: index === 0 ? caption : ''
            }))
          },
          { quoted: m }
        )
      } else {
        const videoFile = files.find(
          file =>
            file?.kind === 'video' &&
            file?.format === 'mp4' &&
            file?.url
        )

        if (!videoFile?.url) {
          throw new Error(
            `La API respondió correctamente, pero no se encontró un video MP4.\n\nArchivos recibidos: ${JSON.stringify(files).slice(0, 500)}`
          )
        }

        await client.sendMessage(
          m.chat,
          {
            video: { url: videoFile.url },
            caption
          },
          { quoted: m }
        )
      }

      const audioUrl =
        files.find(
          file =>
            file?.kind === 'audio' &&
            file?.url
        )?.url || json.audioUrl

      if (audioUrl) {
        await client.sendMessage(
          m.chat,
          {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            ptt: false
          },
          { quoted: m }
        )
      }

    } catch (e) {
      console.log('[tiktok]', e)

      await m.reply(
        `ꕥ *Error en TikTok:*\n\n${e?.message || String(e)}`
      )
    }
  },
}