import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'
import axios from 'axios'
import crypto from 'crypto'

const limit = 300

const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

class SaveTube {
  constructor() {
    this.ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12'

    this.m =
      /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/

    this.headers = {
      'content-type': 'application/json',
      origin: 'https://yt.savetube.me',
      referer: 'https://yt.savetube.me/',
      'user-agent': BROWSER_HEADERS['user-agent'],
    }

    this.is = axios.create({ headers: this.headers })
  }

  async decrypt(enc) {
    const sr = Buffer.from(enc, 'base64')
    const ky = Buffer.from(this.ky, 'hex')
    const iv = sr.slice(0, 16)
    const dt = sr.slice(16)
    const dc = crypto.createDecipheriv('aes-128-cbc', ky, iv)
    return JSON.parse(Buffer.concat([dc.update(dt), dc.final()]).toString())
  }

  async getCdn() {
    const r = await this.is.get('https://media.savetube.vip/api/random-cdn')
    return r.data.cdn
  }

  async download(url, isAudio) {
    const id = url.match(this.m)?.[3]
    if (!id) throw new Error('ID inválido')

    const cdn = await this.getCdn()

    const info = await this.is.post(`https://${cdn}/v2/info`, {
      url: `https://www.youtube.com/watch?v=${id}`,
    })

    const dec = await this.decrypt(info.data.data)

    const dl = await this.is.post(`https://${cdn}/download`, {
      id,
      downloadType: isAudio ? 'audio' : 'video',
      quality: isAudio ? '128' : '720',
      key: dec.key,
    })

    return {
      dl: dl.data.data.downloadUrl,
      title: dec.title,
      headers: this.headers,
    }
  }
}

const LEMPI_API_URL = 'https://api.lempi.lat/dl/ytv?url='
const LEMPI_API_KEY = 'lem715'

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

async function resolveAudioDownload(url) {
  const sv = new SaveTube()
  return sv.download(url, true)
}

async function resolveVideoDownload(url, title) {
  const qualities = [null, '720', '480', '360']
  let lastError

  for (const quality of qualities) {
    try {
      const qParam = quality ? `&quality=${quality}` : ''
      const res = await fetch(
        `${LEMPI_API_URL}${encodeURIComponent(url)}${qParam}&apikey=${LEMPI_API_KEY}`,
        { headers: { accept: 'application/json', 'user-agent': BROWSER_HEADERS['user-agent'] } }
      )

      const text = await res.text()

      if (!res.ok) {
        lastError = new Error(`API Lempi HTTP ${res.status}: ${text.slice(0, 200)}`)
        continue
      }

      let data
      try {
        data = JSON.parse(text)
      } catch {
        lastError = new Error(`Respuesta inválida de Lempi: ${text.slice(0, 200)}`)
        continue
      }

      if (!data?.status) {
        lastError = new Error(data?.mensaje || data?.message || 'La API no devolvió un resultado válido.')
        continue
      }

      // Lempi ha usado distintos nombres de campo con el tiempo (datos vs descarga)
      const info = data.datos || data.descarga
      if (!info?.url) {
        lastError = new Error('La API no devolvió un link de descarga.')
        continue
      }

      return {
        dl: info.url,
        title: data.titulo || title,
        quality: info.calidad || quality || null,
        sizeText: info.tamaño || null,
        headers: BROWSER_HEADERS,
      }
    } catch (e) {
      lastError = e
    }
  }

  throw lastError || new Error('No se pudo descargar el video en ninguna calidad.')
}

async function sendResult({ client, m, url, title, videoInfo, isAudio, asDocument }) {
  const result = isAudio
    ? await resolveAudioDownload(url)
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
