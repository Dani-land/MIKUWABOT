import fetch from 'node-fetch'
import path from 'path'

const NYX_API_URL = 'https://nyxdlapi.vercel.app/api/downloads/mediafire'

const DOWNLOAD_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  referer: 'https://www.mediafire.com/',
}

function isMediafire(url) {
  try {
    return new URL(url).hostname.includes('mediafire.com')
  } catch {
    return false
  }
}

function formatBytes(bytes) {
  if (!bytes) return null
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`
}

async function downloadBuffer(url) {
  const res = await fetch(url, { headers: DOWNLOAD_HEADERS, redirect: 'follow' })

  if (!res.ok) {
    throw new Error(`No se pudo descargar el archivo (${res.status})`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    throw new Error('El servidor devolvió una página HTML en vez del archivo (posible verificación/captcha).')
  }

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length < 50000) {
    throw new Error(`Archivo sospechosamente pequeño (${buffer.length} bytes), probablemente no es el real.`)
  }

  return buffer
}

async function resolveMediafire(url) {
  const res = await fetch(`${NYX_API_URL}?url=${encodeURIComponent(url)}`)
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

  if (!json?.status || !json?.result?.download) {
    throw new Error(json?.message || 'NyxDLaPI no devolvió un link de descarga.')
  }

  return {
    downloadUrl: json.result.download,
    filename: json.result.filename || 'archivo',
    size: json.result.size,
  }
}

export default {
  command: ['mediafire', 'mf'],
  category: 'downloader',

  run: async ({ client, m, args }) => {
    if (!args[0]) return m.reply('✐ Envía un link de Mediafire.')

    const input = args.join(' ').trim()

    if (!isMediafire(input)) {
      return m.reply('✐ Por ahora solo acepto un link directo de Mediafire (mediafire.com/file/...).')
    }

    try {
      const { downloadUrl, filename, size } = await resolveMediafire(input)

      const ext = path.extname(filename) || '.bin'

      const mime = {
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
        '.zip': 'application/zip',
        '.rar': 'application/vnd.rar',
        '.apk': 'application/vnd.android.package-archive',
        '.apks': 'application/vnd.android.package-archive',
        '.pdf': 'application/pdf',
      }[ext.toLowerCase()] || 'application/octet-stream'

      const sizeText = typeof size === 'number' ? formatBytes(size) : size

      const captionLines = [`✦ ${filename}`]
      if (sizeText) captionLines.push(`✧ Tamaño › *${sizeText}*`)
      captionLines.push(`✧ Proxy usada › *NyxDLaPI*`)
      const caption = captionLines.join('\n')

      let buffer = null
      try {
        buffer = await downloadBuffer(downloadUrl)
      } catch (dlError) {
        console.log('[mediafire] buffer falló, uso URL directa:', dlError.message)
      }

      await client.sendMessage(
        m.chat,
        {
          document: buffer ? buffer : { url: downloadUrl },
          fileName: filename,
          mimetype: mime,
          caption,
        },
        { quoted: m }
      )
    } catch (e) {
      console.log('[mediafire]', e.message)
      m.reply('❌ No se pudo obtener el archivo. Revisa que el link sea válido y público.')
    }
  },
}
