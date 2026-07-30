import fetch from 'node-fetch'
import path from 'path'

const NYX_API_URL = 'https://nyxdlapi.vercel.app/api/downloads/mediafire'

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

      await client.sendMessage(
        m.chat,
        {
          document: { url: downloadUrl },
          fileName: filename,
          mimetype: mime,
          caption: captionLines.join('\n'),
        },
        { quoted: m }
      )
    } catch (e) {
      console.log('[mediafire]', e.message)
      m.reply('❌ No se pudo obtener el archivo. Revisa que el link sea válido y público.')
    }
  },
}
