import fetch from 'node-fetch'

const NYX_BASE = 'https://nyxdlapi.vercel.app'
const NYX_IG_URL = `${NYX_BASE}/api/downloads/instagram`

function resolveMediaUrl(u) {
  if (!u) return null
  return u.startsWith('http') ? u : `${NYX_BASE}${u}`
}

async function resolveInstagram(url) {
  const res = await fetch(`${NYX_IG_URL}?url=${encodeURIComponent(url)}`)
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

  const result = json?.result ?? json
  const mediaList = Array.isArray(result?.media) ? result.media : []
  if (!mediaList.length) {
    throw new Error('La API no devolvió ningún archivo multimedia.')
  }

  return {
    mediaList,
    username: result?.autor?.username || result?.author?.username || 'Instagram',
    caption: result?.caption || '',
    likes: result?.estadisticas?.likes ?? result?.stats?.likes ?? null,
    comments: result?.estadisticas?.comentarios ?? result?.stats?.comments ?? null,
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
✰ *Enlace* › ${url}${caption ? `\n\n✎ ${caption}` : ''}

☕︎ *API:* https://nyxdlapi.vercel.app`.trim()

      let enviados = 0

      for (let i = 0; i < mediaList.length; i++) {
        const item = mediaList[i]
        const type = item.tipo === 'video' ? 'video' : 'image'
        const mediaUrl = resolveMediaUrl(item.url)

        if (!mediaUrl) {
          console.log('[instagram] item sin url válida, se omite:', item)
          continue
        }

        try {
          await client.sendMessage(
            m.chat,
            {
              [type]: { url: mediaUrl },
              caption: i === 0 ? info : undefined,
            },
            { quoted: m }
          )
          enviados++
        } catch (sendErr) {
          console.log('[instagram] fallo al enviar un item:', sendErr.message)
        }
      }

      if (enviados === 0) {
        await m.reply('✘ No se pudo enviar ningún archivo multimedia.')
      }
    } catch (e) {
      console.log('[instagram]', e.message)
      await client.reply(m.chat, `ꕥ No se pudo obtener el contenido de Instagram.\n\n⌗» ${e.message}`, m)
    }
  },
}