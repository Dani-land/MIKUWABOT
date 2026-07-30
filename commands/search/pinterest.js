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

    if (!isNaN(lastArg)) {
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

      for (const v of results) {
        let txt = `✿ Pinterest Search\n\n`
        txt += `⌗» Título › ${v.title || 'Sin título'}\n`
        if (v.description) txt += `⌗» Descripción › ${v.description}\n`
        txt += `⌗» Proxy usada › NyxDLaPI\n\n`
        txt += `☕︎ Búsqueda › ${query}`

        await client.sendMessage(
          m.chat,
          {
            image: { url: v.image },
            caption: txt,
          },
          { quoted: m }
        )
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
