import fetch from 'node-fetch'

const NYX_API_URL = 'https://nyxdlapi.vercel.app/api/search/pinterest'

async function searchPinterest(query, limit) {
  const url = `${NYX_API_URL}?q=${encodeURIComponent(query)}&limit=${limit}`
  const res = await fetch(url)
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

  if (!json?.status || !json?.result?.results?.length) {
    throw new Error(json?.message || 'No se encontraron resultados.')
  }

  return json.result.results
}

// Descarga la imagen con headers "de navegador" para evitar el bloqueo
// de hotlinking de Pinterest (por eso salía la burbuja rota)
async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
      Referer: 'https://www.pinterest.com/',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`No se pudo descargar la imagen (HTTP ${res.status})`)
  const buffer = await res.buffer()
  if (!buffer || buffer.length < 500) throw new Error('Imagen vacía o inválida')
  return buffer
}

export default {
  command: ['pinterest', 'pin'],
  category: 'search',

  run: async ({ client, m, args }) => {
    const text = args.join(' ')

    if (!text) {
      return m.reply(
`✐ Ingresa un término de búsqueda.

✰ Ejemplo:
.pin anime icons
.pinterest Hatsune Miku`
      )
    }

    let limit = 5
    let query = text
    const lastArg = args[args.length - 1]

    if (lastArg && !isNaN(lastArg) && lastArg.trim() !== '') {
      limit = parseInt(lastArg)
      if (limit > 10) limit = 10
      if (limit < 1) limit = 1
      query = args.slice(0, -1).join(' ')
    }

    if (!query.trim()) {
      return m.reply('✐ Ingresa un término de búsqueda antes del número.')
    }

    try {
      await m.reply('☕︎ Buscando resultados de Pinterest...')

      const results = await searchPinterest(query, limit)

      // debug: mira en tu consola cómo viene el primer resultado
      console.log('[pinterest] ejemplo de resultado:', JSON.stringify(results[0], null, 2))

      const pickImage = (v) =>
        v.image || v.img || v.url || v.thumbnail || v.imageUrl || v.image_url

      let enviados = 0

      for (const v of results.slice(0, limit)) {
        const imgUrl = pickImage(v)
        if (!imgUrl) {
          console.log('[pinterest] resultado sin imagen, se omite:', v)
          continue
        }

        let txt = `✿ Pinterest Search\n\n`
        txt += `⌗» Título › ${v.title || 'Sin título'}\n`
        if (v.description) txt += `⌗» Descripción › ${v.description}\n`
        txt += `⌗» Proxy usada › NyxDLaPI\n\n`
        txt += `☕︎ Búsqueda › ${query}`

        try {
          const buffer = await downloadImage(imgUrl)

          await client.sendMessage(
            m.chat,
            { image: buffer, caption: txt },
            { quoted: m }
          )
          enviados++
          await new Promise((r) => setTimeout(r, 600))
        } catch (sendErr) {
          console.log('[pinterest] fallo con una imagen, se omite:', sendErr.message)
        }
      }

      if (enviados === 0) {
        await m.reply('✘ No se pudo enviar ninguna imagen. Revisa la consola: puede que el campo de imagen o la URL de Pinterest no sean válidos.')
      }
    } catch (e) {
      console.log('[pinterest]', e.message)
      m.reply(
`✘ Error al buscar en Pinterest.

⌗» ${e.message}`
      )
    }
  },
}