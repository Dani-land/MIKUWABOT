import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'

const limit = 300

const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

const GOHAN_API_BASE = 'https://api-gohan-v1.onrender.com'

const isYTUrl = (url) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/).+$/i.test(url)

async function getBufferFromUrl(url, extraHeaders = {}) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { ...BROWSER_HEADERS, ...extraHeaders },
  })

  if (!res.ok) {
    throw new Error(`No se pudo descargar el archivo (${res.status})`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html') || contentType.includes('application/json')) {
    throw new Error(`El servidor devolvió contenido inválido (${contentType})`)
  }

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length < 10000) {
    throw new Error('Archivo descargado demasiado pequeño, probablemente inválido')
  }

  return buffer
}

async function sendPlayableVideo(client, m, dl, title, thumbBuffer, extraHeaders) {
  const fileName = `${title}.mp4`

  try {
    const buffer = await getBufferFromUrl(dl, extraHeaders)

    await client.sendMessage(
      m.chat,
      {
        video: buffer,
        mimetype: 'video/mp4',
        fileName,
        ptv: false,
        jpegThumbnail: thumbBuffer || undefined,
      },
      { quoted: m }
    )
    return
  } catch (e) {
    console.log('Video buffer falló, usando URL directa:', e.message)
  }

  await client.sendMessage(
    m.chat,
    {
      video: { url: dl },
      mimetype: 'video/mp4',
      fileName,
      ptv: false,
      jpegThumbnail: thumbBuffer || undefined,
    },
    { quoted: m }
  )
}

async function requestGohan(endpoint, url) {
  const apiUrl = `${GOHAN_API_BASE}${endpoint}?url=${encodeURIComponent(url)}`

  const res = await fetch(apiUrl, {
    headers: { accept: 'application/json', 'user-agent': BROWSER_HEADERS['user-agent'] },
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`API Gohan HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Respuesta inválida de Gohan: ${text.slice(0, 200)}`)
  }

  if (!data?.status || !data?.result?.download_url) {
    throw new Error(data?.message || 'La API no devolvió un resultado válido.')
  }

  return data.result
}

export async function resolveAudioDownload(url, title) {
  const result = await requestGohan('/download/ytaudio', url)

  return {
    dl: result.download_url,
    title: result.title || title,
    quality: null,
    sizeText: null,
    headers: BROWSER_HEADERS,
  }
}

async function resolveVideoDownload(url, title) {
  const result = await requestGohan('/download/ytvideo', url)

  return {
    dl: result.download_url,
    title: result.title || title,
    quality: result.quality || null,
    sizeText: null,
    headers: BROWSER_HEADERS,
  }
}

async function sendResult({ client, m, url, title, videoInfo, isAudio, asDocument }) {
  const result = isAudio
    ? await resolveAudioDownload(url, title)
    : await resolveVideoDownload(url, title)

  const { dl, title: apiTitle, headers: dlHeaders } = result
  const finalTitle = apiTitle || title

  // ── Ficha bonita con portada + descripción, antes de mandar el archivo ──────
  let thumbBuffer = null
  if (videoInfo?.thumbnail) {
    try {
      const response = await fetch(videoInfo.thumbnail)
      const arrayBuffer = await response.arrayBuffer()
      thumbBuffer = await sharp(Buffer.from(arrayBuffer)).resize(500, 281).jpeg({ quality: 85 }).toBuffer()
    } catch {}
  }

  const infoLines = [`✿ *${finalTitle}*`, '']
  if (videoInfo?.duration) infoLines.push(`⌗» Duración › ${videoInfo.duration}`)
  if (videoInfo?.views !== undefined) infoLines.push(`⌗» Vistas › ${videoInfo.views?.toLocaleString() || 0}`)
  if (videoInfo?.author?.name) infoLines.push(`⌗» Canal › ${videoInfo.author.name}`)
  if (videoInfo?.ago) infoLines.push(`⌗» Publicado › ${videoInfo.ago}`)
  if (result.quality) infoLines.push(`⌗» Calidad › ${result.quality}`)
  if (result.sizeText) infoLines.push(`⌗» Tamaño › ${result.sizeText}`)
  infoLines.push('', isAudio ? '✐ Enviando audio...' : '✐ Enviando video...')

  const infoText = infoLines.join('\n')

  if (thumbBuffer) {
    await client.sendMessage(m.chat, { image: thumbBuffer, caption: infoText }, { quoted: m })
  } else {
    await client.sendMessage(m.chat, { text: infoText }, { quoted: m })
  }

  // ── Envío del archivo ─────────────────────────────────────────────────────
  if (isAudio) {
    await client.sendMessage(
      m.chat,
      {
        [asDocument ? 'document' : 'audio']: { url: dl },
        mimetype: 'audio/mpeg',
        fileName: `${finalTitle}.mp3`,
      },
      { quoted: m }
    )
    return
  }

  if (asDocument) {
    await client.sendMessage(
      m.chat,
      { document: { url: dl }, fileName: `${finalTitle}.mp4`, mimetype: 'video/mp4' },
      { quoted: m }
    )
    return
  }

  let exceedsLimit = false
  try {
    const head = await fetch(dl, { method: 'HEAD', headers: BROWSER_HEADERS })
    const contentLength = head.headers.get('content-length')
    const fileSize = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0
    exceedsLimit = fileSize >= limit
  } catch {
    exceedsLimit = true
  }

  if (exceedsLimit) {
    await client.sendMessage(
      m.chat,
      { document: { url: dl }, fileName: `${finalTitle}.mp4`, mimetype: 'video/mp4' },
      { quoted: m }
    )
  } else {
    await sendPlayableVideo(client, m, dl, finalTitle, thumbBuffer, dlHeaders)
  }
}

export default {
  command: [
    'play', 'mp3', 'playaudio', 'playdoc', 'ytmp3', 'play2',
    'mp4', 'mp4doc', 'playvideo', 'ytmp4',
  ],

  category: 'downloader',

  run: async ({ client, m, args, command, text }) => {
    try {
      if (!text.trim()) {
        return client.reply(m.chat, '✐ Ingresa un nombre o URL de YouTube.', m)
      }

      const isAudio = ['play', 'mp3', 'playaudio', 'ytmp3', 'playdoc'].includes(command)
      const asDocument = ['playdoc', 'mp4doc'].includes(command)

      let url, title, videoInfo

      if (isYTUrl(text)) {
        url = text
        try {
          videoInfo = await yts({
            videoId: new URL(url).searchParams.get('v') || url.split('/').pop(),
          })
          title = videoInfo?.title || 'Video'
        } catch {
          title = 'Video'
        }
      } else {
        const search = await yts(text)
        if (!search.all.length) {
          return m.reply('ꕥ No encontré resultados.')
        }
        videoInfo = search.all[0]
        title = videoInfo.title
        url = videoInfo.url
      }

      await sendResult({ client, m, url, title, videoInfo, isAudio, asDocument })
    } catch (e) {
      console.log(e)
      m.reply(`✘ Error detectado.\n\n⌗» ${e.message}`)
    }
  },
}
