import axios from 'axios'

const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_BASE = 'https://nyxdlapi.vercel.app'
const NYXDL_TT_SEARCH = 'https://nyxdlapi.vercel.app/api/search/tiktoksearch'

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

function formatCount(n) {
  var num = Number(n || 0)
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString()
}

function getTitle(v) {
  var t = (v && v.title) || 'Sin descripción'
  if (t.length > 80) return t.slice(0, 80) + '...'
  return t
}

function getAuthor(v) {
  if (!v) return 'desconocido'
  if (v.author && typeof v.author === 'object') {
    return v.author.username || v.author.name || 'desconocido'
  }
  return v.username || v.author || 'desconocido'
}

function getStats(v) {
  var s = (v && v.statistics) || {}
  return {
    likes: s.likes || v.likes || 0,
    views: s.vistas || s.views || v.views || 0,
  }
}

function toAbsolute(u) {
  if (!u || typeof u !== 'string') return null
  var s = u.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  if (s.indexOf('//') === 0) return 'https:' + s
  if (s.charAt(0) === '/') return NYXDL_BASE + s
  return null
}

export default {
  command: ['tiktoksearch', 'ttsearch', 'tts'],
  category: 'search',

  run: async function (ctx) {
    var client = ctx.client
    var m = ctx.m
    var args = ctx.args || []

    if (!args.length) {
      return m.reply('✧ Ingresa algo para buscar en TikTok.')
    }

    var query = args.join(' ').trim()

    try {
      var searchUrl =
        NYXDL_TT_SEARCH +
        '?q=' +
        encodeURIComponent(query) +
        '&apikey=' +
        encodeURIComponent(NYXDL_API_KEY)

      var res = await axios.get(searchUrl, {
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      })

      var data = res.data
      var results =
        (data && data.result && data.result.results) ||
        (data && data.result && data.result.resultados) ||
        (data && data.results) ||
        []

      if (!Array.isArray(results) || !results.length) {
        return m.reply('✘ No encontré resultados para *' + query + '*')
      }

      var usable = results
        .map(function (v) {
          var stats = getStats(v)
          return {
            url: toAbsolute(v.video || v.videoWatermarked),
            title: getTitle(v),
            author: getAuthor(v),
            likes: stats.likes,
            views: stats.views,
            link: v.url || null,
          }
        })
        .filter(function (v) {
          return !!v.url
        })

      if (!usable.length) {
        return m.reply(
          '✘ Encontré resultados, pero no pude obtener los videos para *' + query + '*'
        )
      }

      var header =
        '✦ Resultados de TikTok\n' +
        '✧ Búsqueda › ' +
        query +
        '\n' +
        '✧ Enviando ' +
        usable.length +
        ' videos...'

      await client.sendMessage(m.chat, { text: header }, { quoted: m })

      for (var i = 0; i < usable.length; i++) {
        var v = usable[i]

        var caption =
          '✦ TikTok Search\n' +
          '⌗» ' +
          (i + 1) +
          '. ' +
          v.title +
          '\n' +
          '♡ @' +
          v.author +
          '\n' +
          '♡ ' +
          formatCount(v.likes) +
          ' Likes  •  ▶ ' +
          formatCount(v.views) +
          ' Views'

        try {
          await client.sendMessage(
            m.chat,
            {
              video: { url: v.url },
              caption: caption,
            },
            { quoted: m }
          )
        } catch (videoError) {
          console.log('Error enviando video de TikTok:', videoError)
          await client.sendMessage(
            m.chat,
            {
              text: caption + '\n\n' + (v.link || v.url),
            },
            { quoted: m }
          )
        }

        await sleep(1200)
      }
    } catch (e) {
      console.log(e)
      m.reply('❌ Error al buscar videos.\n\n' + (e.message || e))
    }
  },
}