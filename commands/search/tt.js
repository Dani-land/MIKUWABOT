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

async function downloadBuffer(url) {
  var res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxContentLength: 80 * 1024 * 1024,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: '*/*',
      Referer: NYXDL_BASE + '/',
    },
  })

  var buf = Buffer.from(res.data)
  if (!buf || buf.length < 5000) {
    throw new Error('Archivo muy pequeño (' + (buf && buf.length) + ' bytes)')
  }
  return buf
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

      var res = null
      var lastErr = null

      for (var attempt = 1; attempt <= 3; attempt++) {
        try {
          res = await axios.get(searchUrl, {
            timeout: 35000,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Accept: 'application/json',
            },
          })
          break
        } catch (e) {
          lastErr = e
          console.log('[tts] search intento ' + attempt + ':', e.message)
          if (attempt < 3) await sleep(1500 * attempt)
        }
      }

      if (!res) throw lastErr || new Error('No se pudo conectar con la API')

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

      await client.sendMessage(
        m.chat,
        {
          text:
            '✦ Resultados de TikTok\n' +
            '✧ Búsqueda › ' +
            query +
            '\n' +
            '✧ Enviando ' +
            usable.length +
            ' videos...',
        },
        { quoted: m }
      )

      var sent = 0

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

        var ok = false

        // 1) Buffer (más fiable con /api/media?token=...)
        try {
          console.log('[tts] bajando', i + 1, v.url)
          var buffer = await downloadBuffer(v.url)
          await client.sendMessage(
            m.chat,
            {
              video: buffer,
              mimetype: 'video/mp4',
              caption: caption,
            },
            { quoted: m }
          )
          ok = true
          sent++
        } catch (e1) {
          console.log('[tts] buffer falló', i + 1, e1.message)
        }

        // 2) URL directa
        if (!ok) {
          try {
            await client.sendMessage(
              m.chat,
              {
                video: { url: v.url },
                mimetype: 'video/mp4',
                caption: caption,
              },
              { quoted: m }
            )
            ok = true
            sent++
          } catch (e2) {
            console.log('[tts] url falló', i + 1, e2.message)
          }
        }

        // 3) Solo texto + link
        if (!ok) {
          await client.sendMessage(
            m.chat,
            {
              text: caption + '\n\n🔗 ' + (v.link || v.url),
            },
            { quoted: m }
          )
        }

        await sleep(1000)
      }

      if (sent === 0) {
        await m.reply(
          '✘ No pude enviar ningún video. Los links de media pueden estar caídos o bloqueados.'
        )
      } else {
        await m.reply('✓ Enviados *' + sent + '* de *' + usable.length + '* videos.')
      }
    } catch (e) {
      console.log('[tts] ERROR:', e)
      m.reply('❌ Error al buscar videos.\n\n' + (e.message || e))
    }
  },
}