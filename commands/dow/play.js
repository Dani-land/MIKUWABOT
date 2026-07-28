import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'
import axios from 'axios'
import crypto from 'crypto'
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys'

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
        caption: `✦ ${title}`,
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
      caption: `✦ ${title}`,
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
  const res = await fetch(`${LEMPI_API_URL}${encodeURIComponent(url)}&apikey=${LEMPI_API_KEY}`, {
    headers: { accept: 'application/json', 'user-agent': BROWSER_HEADERS['user-agent'] },
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`API Lempi HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Respuesta inválida de Lempi: ${text.slice(0, 200)}`)
  }

  if (!data?.status) {
    throw new Error(data?.message || 'La API no devolvió un resultado válido.')
  }

  if (!data?.descarga?.url) {
    throw new Error('La API no devolvió la URL de descarga.')
  }

  return {
    dl: data.descarga.url,
    title: data.titulo || title,
    quality: data.descarga.calidad || null,
    sizeText: data.descarga.tamaño || null,
    headers: BROWSER_HEADERS,
  }
}

async function sendResult({ client, m, url, title, videoInfo, isAudio, asDocument }) {
  const result = isAudio
    ? await resolveAudioDownload(url)
    : await resolveVideoDownload(url, title)

  const { dl, title: apiTitle, headers: dlHeaders } = result

  let thumbBuffer = null
  if (videoInfo?.thumbnail) {
    try {
      const response = await fetch(videoInfo.thumbnail)
      const arrayBuffer = await response.arrayBuffer()
      thumbBuffer = await sharp(Buffer.from(arrayBuffer)).resize(320, 180).jpeg({ quality: 80 }).toBuffer()
    } catch {}
  }

  const finalTitle = apiTitle || title

  if (isAudio) {
    await client.sendMessage(
      m.chat,
      {
        [asDocument ? 'document' : 'audio']: { url: dl },
        mimetype: 'audio/mpeg',
        fileName: `${finalTitle}.mp3`,
        jpegThumbnail: thumbBuffer || undefined,
      },
      { quoted: m }
    )
    return
  }

  const caption = result.quality || result.sizeText
    ? `✦ ${finalTitle}\n${result.quality ? `✧ Calidad › *${result.quality}*` : ''}`.trim()
    : `✦ ${finalTitle}`

  if (asDocument) {
    await client.sendMessage(
      m.chat,
      { document: { url: dl }, fileName: `${finalTitle}.mp4`, mimetype: 'video/mp4', caption },
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
      { document: { url: dl }, fileName: `${finalTitle}.mp4`, mimetype: 'video/mp4', caption },
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

  run: async ({ client, m, args, command, text, usedPrefix }) => {
    const prefix = usedPrefix || global.prefix || '.'
    const conn = client

    try {
      if (!text.trim()) {
        return (conn.reply || conn.sendMessage)(m.chat, '✐ Ingresa un nombre o URL de YouTube.', m)
      }

      const esURL = isYTUrl(text)

      const isAudio = ['play', 'mp3', 'playaudio', 'ytmp3', 'playdoc'].includes(command)
      const asDocument = ['playdoc', 'mp4doc'].includes(command)

      let url, title, videoInfo

      if (esURL) {
        url = text
        try {
          videoInfo = await yts({
            videoId: new URL(url).searchParams.get('v') || url.split('/').pop(),
          })
          title = videoInfo?.title || 'Video'
        } catch {
          title = 'Video'
        }

        return sendResult({ client: conn, m, url, title, videoInfo, isAudio, asDocument })
      }

      const search = await yts(text)
      if (!search.all.length) {
        return m.reply('ꕥ No encontré resultados.')
      }

      videoInfo = search.all[0]
      ;({ title, url } = videoInfo)

      const bodyText = `✿ *${title}*\n\n⌗» Duración › ${videoInfo.duration}\n⌗» Vistas › ${videoInfo.views?.toLocaleString() || 0}\n⌗» Canal › ${videoInfo.author?.name || 'Desconocido'}\n⌗» Publicado › ${videoInfo.ago || 'Desconocido'}\n\n✧ Selecciona una opción del menú:`

      let media = null
      if (videoInfo.thumbnail) {
        try {
          media = await prepareWAMessageMedia(
            { image: { url: videoInfo.thumbnail } },
            { upload: conn.waUploadToServer }
          )
        } catch {}
      }

      const rows = [
        {
          title: '🎬 Video (MP4)',
          description: 'Descargar video normal',
          id: `${prefix}mp4 ${url}`,
        },
        {
          title: '📁 Video (Documento)',
          description: 'Descargar video como archivo',
          id: `${prefix}mp4doc ${url}`,
        },
        {
          title: '🎵 Audio (MP3)',
          description: 'Descargar audio en MP3',
          id: `${prefix}mp3 ${url}`,
        },
        {
          title: '📁 Audio (Documento)',
          description: 'Descargar audio como archivo',
          id: `${prefix}playdoc ${url}`,
        },
      ]

      const interactive = proto.Message.InteractiveMessage.fromObject({
        body: { text: bodyText },
        footer: { text: 'Toca el botón de abajo para elegir' },
        ...(media
          ? {
              header: {
                hasMediaAttachment: true,
                imageMessage: media.imageMessage,
              },
            }
          : {}),
        nativeFlowMessage: {
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: '📜 Opciones de Descarga',
                sections: [
                  {
                    title: 'FORMATOS DISPONIBLES',
                    highlight_label: '📥',
                    rows,
                  },
                ],
              }),
            },
          ],
        },
        contextInfo: {
          mentionedJid: [m.sender],
        },
      })

      const msg = generateWAMessageFromContent(
        m.chat,
        {
          viewOnceMessage: {
            message: { interactiveMessage: interactive },
          },
        },
        { quoted: m }
      )

      await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    } catch (e) {
      console.log(e)
      m.reply(`✘ Error detectado.\n\n⌗» ${e.message}`)
    }
  },
}
