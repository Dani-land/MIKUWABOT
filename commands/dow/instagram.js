import fetch from 'node-fetch'

const LEMPI_API_URL = 'https://api.lempi.lat/dl/ig?url='
const LEMPI_API_KEY = 'lem715'

async function resolveInstagram(url) {
  const res = await fetch(`${LEMPI_API_URL}${encodeURIComponent(url)}&apikey=${LEMPI_API_KEY}`)
  const text = await res.text()

  if (!res.ok) {
    throw new Error(`API Lempi HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Respuesta inválida de la API: ${text.slice(0, 200)}`)
  }

  if (!json?.status) {
    throw new Error(json?.message || 'La API no devolvió un resultado válido.')
  }

  const mediaList = Array.isArray(json?.media) ? json.media : []
  if (!mediaList.length) {
    throw new Error('La API no devolvió ningún archivo multimedia.')
  }

  return {
    mediaList,
    username: json?.autor?.username || 'Instagram',
    caption: json?.caption || '',
    likes: json?.estadisticas?.likes ?? null,
    comments: json?.estadisticas?.comentarios ?? null,
  }
}

export default {
  command: ['instagram', 'ig'],
  category: 'downloader',

  run: async ({ client, m, args }) => {
    const url = args[0]

    if (!url) {
      return m.reply('✐ Ingresa algún *URL* de *Instagram*.')
    }

    if (!url.match(/instagram\.com\/(p|reel|share|tv)\//)) {
      return m.reply('✐ Asegúrate que el *URL* sea de *Instagram*')
    }

    try {
      const { mediaList, username, caption, likes, comments } = await resolveInstagram(url)

      const info = `*INSTAGRAM*

✰ *Cuenta* › ${username}
✿ *Likes* › ${likes ?? 'N/A'}
✰ *Comentarios* › ${comments ?? 'N/A'}
✿ *Contenido* › ${mediaList.length > 1 ? `${mediaList.length} archivos` : mediaList[0].tipo}
✰ *Enlace* › ${url}${caption ? `\n\n✎ ${caption}` : ''}`.trim()

      for (let i = 0; i < mediaList.length; i++) {
        const item = mediaList[i]
        const type = item.tipo === 'video' ? 'video' : 'image'

        await client.sendMessage(
          m.chat,
          {
            [type]: { url: item.url },
            caption: i === 0 ? info : undefined,
          },
          { quoted: m }
        )
      }
    } catch (e) {
      console.log('[instagram]', e.message)
      await client.reply(m.chat, 'ꕥ No se pudo obtener el contenido de Instagram.', m)
    }
  },
}
