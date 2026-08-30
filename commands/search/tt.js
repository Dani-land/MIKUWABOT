import axios from 'axios'

const DVYER_API_KEY = 'dvyer2008'
const DVYER_TT_SEARCH = 'https://dv-yer-api.online/tiktok/search'
const DVYER_TT_DL = 'https://dv-yer-api.online/ttdlmp4'
const MAX_VIDEOS = 5

function formatCount(n) {
  var num = Number(n || 0)
  if (Number.isNaN(num) || n == null) return '0'
  return num.toLocaleString()
}

function getTitle(v) {
  var t = (v && (v.title || v.description)) || 'Sin descripción'
  if (t.length > 80) return t.slice(0, 80) + '...'
  return t
}

function getAuthor(v) {
  if (!v) return 'desconocido'
  return v.username || v.author || 'desconocido'
}

function getTikTokPage(v) {
  return (
    (v && (v.share_url || v.video_url)) ||
    (v && v.links && v.links.tiktok) ||
    null
  )
}

async function resolveVideoUrl(tiktokPage) {
  if (!tiktokPage) return null

  var apiUrl =
    DVYER_TT_DL +
    '?url=' +
    encodeURIComponent(tiktokPage) +
    '&mode=link&apikey=' +
    encodeURIComponent(DVYER_API_KEY)

  var res = await axios.get(apiUrl, {
    timeout: 45000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  })

  var d = res.data || {}
  var videoUrl =
    d.url ||
    d.download_url ||
    d.stream_url ||
    d.download_url_full ||
    d.stream_url_full ||
    null

  if (!videoUrl || typeof videoUrl !== 'string') return null
  if (videoUrl.indexOf('//') === 0) videoUrl = 'https:' + videoUrl
  return videoUrl
}

async function downloadBuffer(url) {
  var res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 90000,
    maxContentLength: 80 * 1024 * 1024,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: '*/*',
    },
  })
  var buf = Buffer.from(res.data)
  if (!buf || buf.length < 5000) throw new Error('archivo muy pequeño')
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
        DVYER_TT_SEARCH +
        '?apikey=' +
        encodeURIComponent(DVYER_API_KEY) +
        '&q=' +
        encodeURIComponent(query) +
        '&limit=' +
        MAX_VIDEOS

      var res = await axios.get(searchUrl, {
        timeout: 35000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      })

      var data = res.data
      var results = (data && data.results) || []

      if (!Array.isArray(results) || !results.length) {
        return m.reply('✘ No encontré resultados para *' + query + '*')
      }

      var top = results.slice(0, MAX_VIDEOS)

      await m.reply(
        '✐ Encontré resultados. Preparando hasta *' + top.length + '* videos...'
      )

      var usable = []

      for (var i = 0; i < top.length; i++) {
        var item = top[i]
        var page = getTikTokPage(item)
        if (!page) continue

        try {
          var videoUrl = await resolveVideoUrl(page)
          if (!videoUrl) continue

          var caption =
            '*ꕥ TikTok Búsqueda*\n' +
            '⌗» ' +
            (usable.length + 1) +
            '. ' +
            getTitle(item) +
            '\n' +
            '♡ @' +
            getAuthor(item)

          if (item.likes != null || item.views != null) {
            caption +=
              '\n♡ ' +
              formatCount(item.likes) +
              ' Likes  •  ▶ ' +
              formatCount(item.views) +
              ' Views'
          }

          // Preferir buffer para el álbum (más fiable)
          var buffer = null
          try {
            buffer = await downloadBuffer(videoUrl)
          } catch (e) {
            console.log('[tts] buffer falló, usaré URL:', e.message)
          }

          usable.push({
            url: videoUrl,
            buffer: buffer,
            caption: caption,
            link: page,
          })
        } catch (e) {
          console.log('[tts] omitido:', e.message)
        }
      }

      if (!usable.length) {
        return m.reply(
          '✘ Encontré resultados, pero no pude obtener los videos para *' + query + '*'
        )
      }

      // Álbum con buffers (o URL si no hubo buffer)
      var album = usable.map(function (v) {
        if (v.buffer) {
          return { video: v.buffer, caption: v.caption }
        }
        return { video: { url: v.url }, caption: v.caption }
      })

      try {
        await client.sendMessage(m.chat, { album: album }, { quoted: m })
      } catch (albumErr) {
        console.log('[tts] album falló, uno por uno:', albumErr.message)

        for (var j = 0; j < usable.length; j++) {
          var v = usable[j]
          try {
            if (v.buffer) {
              await client.sendMessage(
                m.chat,
                { video: v.buffer, mimetype: 'video/mp4', caption: v.caption },
                { quoted: m }
              )
            } else {
              await client.sendMessage(
                m.chat,
                { video: { url: v.url }, mimetype: 'video/mp4', caption: v.caption },
                { quoted: m }
              )
            }
          } catch (e) {
            await client.sendMessage(
              m.chat,
              { text: v.caption + '\n\n' + (v.link || v.url) },
              { quoted: m }
            )
          }
        }
      }
    } catch (e) {
      console.log(
        '[tiktoksearch] ERROR:',
        e && e.response && e.response.status,
        (e && e.response && e.response.data) || e.message
      )
      m.reply('❌ Error al buscar videos.\n\n' + (e.message || e))
    }
  },
}