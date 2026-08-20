import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'

const limit = 300
const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_BASE = 'https://nyxdlapi.vercel.app'
const NYXDL_AUDIO = 'https://nyxdlapi.vercel.app/api/downloads/youtube'
const NYXDL_VIDEO = 'https://nyxdlapi.vercel.app/api/downloads/youtube/mp4'

const NEWSLETTER_JID = '120363420575743790@newsletter'
const NEWSLETTER_NAME = 'Hatsune Miku / Wa'

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

function isYTUrl(u) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i.test(u || '')
}

function abs(u) {
  if (!u || typeof u !== 'string') return null
  var s = u.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  if (s.indexOf('//') === 0) return 'https:' + s
  if (s.charAt(0) === '/') return NYXDL_BASE + s
  return null
}

function newsletterContext() {
  return {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: NEWSLETTER_JID,
      newsletterName: NEWSLETTER_NAME,
      serverMessageId: -1,
    },
  }
}

function extractVideoId(url) {
  try {
    var full = url.indexOf('http') === 0 ? url : 'https://' + url
    var u = new URL(full)
    if (u.hostname.indexOf('youtu.be') !== -1) {
      return u.pathname.replace('/', '').split('/')[0]
    }
    return u.searchParams.get('v') || null
  } catch (e) {
    return null
  }
}

async function callNyxDL(endpoint, ytUrl) {
  var clean = abs(ytUrl)
  if (!clean) {
    if (ytUrl && String(ytUrl).indexOf('http') === 0) clean = String(ytUrl).trim()
    else if (ytUrl) clean = 'https://' + String(ytUrl).trim()
  }
  if (!clean || !/^https?:\/\//i.test(clean)) {
    throw new Error('URL de YouTube inválida: ' + ytUrl)
  }

  var apiUrl =
    endpoint +
    '?url=' +
    encodeURIComponent(clean) +
    '&apikey=' +
    encodeURIComponent(NYXDL_API_KEY)

  console.log('[NyxDL] GET', apiUrl)

  var lastErr = null
  var attempts = 2

  for (var i = 1; i <= attempts; i++) {
    try {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      var timer = null
      if (controller) {
        timer = setTimeout(function () {
          controller.abort()
        }, 90000)
      }

      var res = await fetch(apiUrl, {
        headers: { accept: 'application/json', 'user-agent': HEADERS['user-agent'] },
        timeout: 90000,
        signal: controller ? controller.signal : undefined,
      })

      if (timer) clearTimeout(timer)

      var text = await res.text()

      if (!res.ok) {
        throw new Error('NyxDL HTTP ' + res.status + ': ' + text.slice(0, 180))
      }

      var data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('NyxDL no devolvió JSON: ' + text.slice(0, 180))
      }

      var r = data && data.result ? data.result : {}
      var dl =
        abs(r.download_url) ||
        abs(r.download) ||
        abs(r.url) ||
        abs(r.datos && r.datos.url) ||
        abs(r.datos && r.datos.download)

      if (!data || !data.status || !dl) {
        throw new Error((data && data.message) || 'NyxDL no devolvió link de descarga.')
      }

      return {
        dl: dl,
        title: r.title || r.titulo || 'Sin título',
        duration: r.duration || r.duracion || null,
        channel: r.channel || r.canal || null,
        quality: r.quality || (r.datos && r.datos.calidad) || null,
        size: r.size || (r.datos && r.datos['tamaño']) || null,
        thumbnail: abs(r.thumbnail) || null,
      }
    } catch (e) {
      lastErr = e
      var msg = (e && e.message) || String(e)
      console.log('[NyxDL] intento ' + i + '/' + attempts + ' falló:', msg)

      if (i < attempts && /ETIMEDOUT|timeout|aborted|ECONNRESET|ENOTFOUND|network/i.test(msg)) {
        await new Promise(function (r) {
          setTimeout(r, 2000)
        })
        continue
      }
      break
    }
  }

  throw new Error(
    'No se pudo conectar con la API (timeout). Prueba de nuevo en unos segundos.\nDetalle: ' +
      ((lastErr && lastErr.message) || 'ETIMEDOUT')
  )
}

async function sendResult(opts) {
  var client = opts.client
  var m = opts.m
  var url = opts.url
  var title = opts.title
  var videoInfo = opts.videoInfo
  var isAudio = opts.isAudio
  var asDocument = opts.asDocument

  var result = isAudio
    ? await callNyxDL(NYXDL_AUDIO, url)
    : await callNyxDL(NYXDL_VIDEO, url)

  var finalTitle = result.title || title || 'archivo'
  var dl = abs(result.dl)
  if (!dl) throw new Error('Link de descarga vacío o inválido')

  console.log('[NyxDL] download =', dl)

  var thumbBuffer = null
  var thumbSrc = result.thumbnail || abs(videoInfo && videoInfo.thumbnail)
  if (thumbSrc) {
    try {
      var tr = await fetch(thumbSrc, { headers: HEADERS })
      if (tr.ok) {
        var buf = Buffer.from(await tr.arrayBuffer())
        thumbBuffer = await sharp(buf).resize(500, 281).jpeg({ quality: 85 }).toBuffer()
      }
    } catch (e) {
      console.log('thumb fail:', e.message)
    }
  }

  var lines = ['✿ *' + finalTitle + '*', '']
  if (result.duration || (videoInfo && (videoInfo.timestamp || videoInfo.duration))) {
    lines.push(
      '⌗» Duración › ' + (result.duration || videoInfo.timestamp || videoInfo.duration)
    )
  }
  if (videoInfo && videoInfo.views != null) {
    lines.push('⌗» Vistas › ' + Number(videoInfo.views).toLocaleString())
  }
  if (result.channel || (videoInfo && videoInfo.author && videoInfo.author.name)) {
    lines.push('⌗» Canal › ' + (result.channel || videoInfo.author.name))
  }
  if (videoInfo && videoInfo.ago) lines.push('⌗» Publicado › ' + videoInfo.ago)
  if (result.quality) lines.push('⌗» Calidad › ' + result.quality)
  if (result.size) lines.push('⌗» Tamaño › ' + result.size)
  lines.push('')
  lines.push(isAudio ? '✐ Enviando audio...' : '✐ Enviando video...')

  var infoText = lines.join('\n')
  var ctx = newsletterContext()

  if (thumbBuffer) {
    await client.sendMessage(
      m.chat,
      { image: thumbBuffer, caption: infoText, contextInfo: ctx },
      { quoted: m }
    )
  } else {
    await client.sendMessage(
      m.chat,
      { text: infoText, contextInfo: ctx },
      { quoted: m }
    )
  }

  if (isAudio) {
    var audioMsg = {
      mimetype: 'audio/mpeg',
      fileName: finalTitle + '.mp3',
      contextInfo: ctx,
    }
    if (asDocument) audioMsg.document = { url: dl }
    else audioMsg.audio = { url: dl }

    await client.sendMessage(m.chat, audioMsg, { quoted: m })
    return
  }

  var asDoc = asDocument
  if (!asDoc) {
    try {
      var head = await fetch(dl, { method: 'HEAD', headers: HEADERS })
      var len = head.headers.get('content-length')
      var mb = len ? parseInt(len, 10) / (1024 * 1024) : 0
      if (mb >= limit) asDoc = true
    } catch (e) {
      asDoc = true
    }
  }

  if (asDoc) {
    await client.sendMessage(
      m.chat,
      {
        document: { url: dl },
        fileName: finalTitle + '.mp4',
        mimetype: 'video/mp4',
        contextInfo: ctx,
      },
      { quoted: m }
    )
    return
  }

  try {
    var vres = await fetch(dl, { headers: HEADERS, redirect: 'follow' })
    if (!vres.ok) throw new Error('HTTP ' + vres.status)
    var vbuf = Buffer.from(await vres.arrayBuffer())
    if (vbuf.length < 10000) throw new Error('archivo muy pequeño')

    await client.sendMessage(
      m.chat,
      {
        video: vbuf,
        mimetype: 'video/mp4',
        fileName: finalTitle + '.mp4',
        ptv: false,
        jpegThumbnail: thumbBuffer || undefined,
        contextInfo: ctx,
      },
      { quoted: m }
    )
  } catch (e) {
    console.log('video buffer fail, URL directa:', e.message)
    await client.sendMessage(
      m.chat,
      {
        video: { url: dl },
        mimetype: 'video/mp4',
        fileName: finalTitle + '.mp4',
        ptv: false,
        jpegThumbnail: thumbBuffer || undefined,
        contextInfo: ctx,
      },
      { quoted: m }
    )
  }
}

export default {
  command: [
    'play',
    'mp3',
    'playaudio',
    'playdoc',
    'ytmp3',
    'play2',
    'mp4',
    'mp4doc',
    'playvideo',
    'ytmp4',
  ],
  category: 'downloader',

  run: async function (ctx) {
    var client = ctx.client
    var m = ctx.m
    var command = ctx.command
    var text = ctx.text

    try {
      if (!text || !String(text).trim()) {
        return client.reply(m.chat, '✐ Ingresa un nombre o URL de YouTube.', m)
      }

      var isAudio = ['play', 'mp3', 'playaudio', 'ytmp3', 'playdoc', 'play2'].indexOf(command) !== -1
      var asDocument = ['playdoc', 'mp4doc'].indexOf(command) !== -1

      var url
      var title
      var videoInfo

      if (isYTUrl(text)) {
        url = String(text).trim()
        if (url.indexOf('http') !== 0) url = 'https://' + url
        var id = extractVideoId(url)
        try {
          videoInfo = id ? await yts({ videoId: id }) : null
          title = (videoInfo && videoInfo.title) || 'Video'
        } catch (e) {
          title = 'Video'
        }
      } else {
        var search = await yts(String(text).trim())
        if (!search || !search.all || !search.all.length) {
          return m.reply('ꕥ No encontré resultados.')
        }
        videoInfo = search.all[0]
        title = videoInfo.title
        url = videoInfo.url
      }

      url = abs(url) || url
      if (!url || !/^https?:\/\//i.test(url)) {
        return m.reply('✘ No pude obtener una URL válida de YouTube.')
      }

      await sendResult({
        client: client,
        m: m,
        url: url,
        title: title,
        videoInfo: videoInfo,
        isAudio: isAudio,
        asDocument: asDocument,
      })
    } catch (e) {
      console.error('[play]', e)
      m.reply('✘ Error detectado.\n\n⌗» ' + e.message)
    }
  },
}