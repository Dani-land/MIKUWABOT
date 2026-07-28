import fetch from 'node-fetch'

const IG_API_URL = 'https://api.lempi.lat/dl/ig'
const IG_API_KEY = 'lem715'

async function resolveInstagram(url) {
  const apiUrl = IG_API_KEY
    ? `${IG_API_URL}?url=${encodeURIComponent(url)}&apikey=${IG_API_KEY}`
    : `${IG_API_URL}?url=${encodeURIComponent(url)}`

  const res = await fetch(apiUrl)
  const text = await res.text()

  if (!res.ok) {
    throw new Error(`API Instagram HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Respuesta inválida de la API: ${text.slice(0, 200)}`)
  }

  const media =
    json?.download ||
    json?.dl ||
    json?.url ||
    json?.result?.download ||
    json?.result?.url ||
    json?.data?.download ||
    json?.data?.url ||
    json?.media?.url ||
    json?.mediaUrls?.[0]

  if (!media) {
    throw new Error(json?.message || 'La API no devolvió un link de descarga.')
  }

  const type =
    (json?.type || json?.data?.type || '').includes('video') ? 'video' : 'image'

  const title =
    json?.title || json?.username || json?.author || json?.data?.username || 'Instagram'

  const like = json?.like || json?.likes || json?.data?.like || json?.data?.likes || null
  const comment =
    json?.comment || json?.comments || json?.data?.comment || json?.data?.comments || null

  return { media, type, title, like, comment }
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
      const { media, type, title, like, comment } = await resolveInstagram(url)

      const caption = `*INSTAGRAM*

✰ *Titulo* › ${title}
✿ *Likes* › ${like || 'N/A'}
✰ *Comentarios* › ${comment || 'N/A'}
✿ *Tipo* › ${type}
✰ *Enlace* › ${url}`.trim()

      await client.sendMessage(
        m.chat,
        {
          [type]: { url: media },
          caption,
        },
        { quoted: m }
      )
    } catch (e) {
      console.log('[instagram]', e.message)
      await client.reply(m.chat, 'ꕥ No se pudo obtener el contenido de Instagram.', m)
    }
  },
}
