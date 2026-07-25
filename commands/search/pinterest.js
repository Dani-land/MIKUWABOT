import fetch from 'node-fetch'

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

    try {

      await m.reply(
        '☕︎ Buscando resultados de Pinterest...'
      )

      const api =
`https://tester-web.onrender.com/api/pinterest?query=${encodeURIComponent(query)}&limit=${limit}`

      const res = await fetch(api)
      const json = await res.json()

      if (!json.status || !json.results?.length) {
        return m.reply(
          `ꕥ No encontré resultados para "${query}".`
        )
      }

      const results = json.results.slice(0, limit)

      for (const v of results) {

        let txt = `✿ Pinterest Search\n\n`

        txt += `⌗» Título › ${
          v.titulo || 'Sin título'
        }\n`

        txt += `⌗» Autor › ${
          v.autor || 'Desconocido'
        }\n`

        txt += `⌗» Likes › ${
          v.likes || 0
        }\n`

        txt += `⌗» Tipo › ${
          v.tipo || 'imagen'
        }\n`

        txt += `⌗» Proxi usada › tester-web.onrender.com\n\n`

        txt += `☕︎ Búsqueda › ${query}`

        if (v.tipo === 'video') {

          await client.sendMessage(
            m.chat,
            {
              video: {
                url: v.descarga
              },
              caption: txt
            },
            { quoted: m }
          )

        } else {

          await client.sendMessage(
            m.chat,
            {
              image: {
                url: v.descarga
              },
              caption: txt
            },
            { quoted: m }
          )
        }
      }

    } catch (e) {

      console.log(e)

      m.reply(
`✘ Error al buscar en Pinterest.

⌗» ${e.message}`
      )
    }
  }
}