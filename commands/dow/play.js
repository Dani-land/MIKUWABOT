import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'

const limit = 300
const DLAPIXY_BASE = 'https://dlapixy.vercel.app'
const DLAPIXY_AUDIO = 'https://dlapixy.vercel.app/api/downloads/youtube/audio'
const DLAPIXY_VIDEO = 'https://dlapixy.vercel.app/api/downloads/youtube/video'

const NEWSLETTER_JID = '120363420575743790@newsletter'
const NEWSLETTER_NAME = 'ᰔᩚ Mιкυ Pʀσʝєᴄтѕ'

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
  if (s.charAt(0) === '/') return DLAPIXY_BASE + s
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

async function callDlapixy(endpoint, ytUrl, extra) {
  extra = extra || {}
  var clean = abs(ytUrl)
  if (!clean) {
    if (ytUrl && String(ytUrl).indexOf('http') === 0) clean = String(ytUrl).trim()
    else if (ytUrl) clean = 'https://' + String(ytUrl).trim()
  }
  if (!clean || !/^https?:\/\//i.test(clean)) {
    throw new Error('URL de YouTube inválida: ' + ytUrl)
  }

  var body = { url: clean }
  if (extra.quality) body.quality = extra.quality

  console.log('[dlapixy] POST', endpoint, JSON.stringify(body))

  var lastErr = null
  for (var i = 1; i <= 2; i++) {
    try {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      var timer = null
      if (controller) {
        timer = setTimeout(function () {
          controller.abort()
        }, 90000)
      }

      var res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'user-agent': HEADERS['user-agent'],
        },
        body: JSON.stringify(body),
        timeout: 90000,
        signal: controller ? controller.signal : undefined,
      })
      if (timer) clearTimeout(timer)

      var text = await res.text()
      if (!res.ok) throw new Error('dlapixy HTTP ' + res.status + ': ' + text.slice(0, 180))

      var data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('dlapixy no devolvió JSON: ' + text.slice(0, 180))
      }

      var file = Array.isArray(data && data.files) ? data.files[0] : null
      var dl = abs(file && file.url)

      if (!data || data.ok !== true || !dl) {
        throw new Error((data && data.message) || 'dlapixy no devolvió link de descarga.')
      }

      return {
        dl: dl,
        title: data.title || 'Sin título',
        duration: data.durationSeconds || null,
        quality: file.quality || null,
        format: file.format || null,
        mime: file.mimeType || null,
        thumbnail: abs(data.thumbnail) || null,
      }
    } catch (e) {
      lastErr = e
      console.log('[dlapixy] intento ' + i + ' falló:', e.message)
      if (i < 2 && /ETIMEDOUT|timeout|aborted|ECONNRESET|ENOTFOUND|network/i.test(e.message)) {
        await new Promise(function (r) {
          setTimeout(r, 2000)
        })
        continue
      }
      break
    }
  }

  throw new Error(
    'No se pudo conectar con la API.\nDetalle: ' + ((lastErr && lastErr.message) || 'error')
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
    ? await callDlapixy(DLAPIXY_AUDIO, url, {})
    : await callDlapixy(DLAPIXY_VIDEO, url, { quality: '360' })

  var finalTitle = result.title || title || 'archivo'
  var dl = abs(result.dl)
  if (!dl) throw new Error('Link de descarga vacío o inválido')

  console.log('[dlapixy] download =', dl)

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

  var lines = ['☘︎ *' + finalTitle + '*', '']
  if (result.duration || (videoInfo && (videoInfo.timestamp || videoInfo.duration))) {
    lines.push(
      '⌗» 𝙳𝚞𝚛𝚊𝚌𝚒𝚘𝚗 › ' + (result.duration || videoInfo.timestamp || videoInfo.duration)
    )
  }
  if (videoInfo && videoInfo.views != null) {
    lines.push('⌗» 𝚅𝚒𝚜𝚝𝚊𝚜 › ' + Number(videoInfo.views).toLocaleString())
  }
  if (videoInfo && videoInfo.author && videoInfo.author.name) {
    lines.push('⌗» 𝙲𝚊𝚗𝚊𝚕 › ' + videoInfo.author.name)
  }
  if (videoInfo && videoInfo.ago) lines.push('⌗» 𝙿𝚞𝚋𝚕𝚒𝚌𝚊𝚍𝚘 › ' + videoInfo.ago)
  if (result.quality) lines.push('⌗» 𝙲𝚊𝚕𝚒𝚍𝚊𝚍 › ' + result.quality)
  if (result.size) lines.push('⌗» 𝚃𝚊𝚖𝚊𝚗̃𝚘 › ' + result.size)
  lines.push('')
  lines.push(isAudio ? '> ❁ ᗴᑎᐯIᗩᑎᗪO ᗩᑌᗪIO...' : '> 𑁍 ᗴᑎᐯIᗩᑎᗪO ᐯIᗪᗴO...')

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
    var audioMime = result.mime || 'audio/mpeg'
    var ext = /mpeg|mp3/i.test(audioMime) ? '.mp3' : '.m4a'
    var audioMsg = {
      mimetype: audioMime,
      fileName: finalTitle + ext,
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
      var head = await fetch(dl, { method: 'HEAD', headers: HEADERS, redirect: 'follow' })
      var len = head.headers.get('content-length')
      var mb = len ? parseInt(len, 10) / (1024 * 1024) : 0
      if (mb >= limit) asDoc = true
      if (head.url) dl = head.url
    } catch (e) {
      // se intenta igual con la URL original
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

export default {
  command: [
    'play',
    'mp3',
    'playaudio',
    'playdoc',
    'ytmp3',
    'mp4',
    'play2',
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
        return client.reply(m.chat, '𖣘 Ingresa un nombre o URL de YouTube.', m)
      }

      var isAudio = ['play', 'mp3', 'playaudio', 'ytmp3', 'playdoc'].indexOf(command) !== -1
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