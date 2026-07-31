import axios from 'axios'
import * as cheerio from 'cheerio'
import path from 'path'

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

function isMediafire(url) {
  try {
    return new URL(url).hostname.includes('mediafire.com')
  } catch {
    return false
  }
}

async function scrapeMediafire(url) {
  const res = await axios.get(url, { headers: HEADERS, timeout: 20000 })
  const $ = cheerio.load(res.data)

  const downloadUrl =
    ($('#downloadButton').attr('href') || '').trim() ||
    ($('div#download_link > a.retry').attr('href') || '').trim()

  if (!downloadUrl) {
    throw new Error('No se encontró el link de descarga en la página de Mediafire.')
  }

  const filename =
    $('div.dl-info > div.intro > div.filename').text().trim() ||
    $('title').text().replace(/ - Mediafire.*$/i, '').trim() ||
    'archivo'

  return { downloadUrl, filename }
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
      const { downloadUrl, filename } = await scrapeMediafire(input)

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

      await client.sendMessage(
        m.chat,
        {
          document: { url: downloadUrl },
          fileName: filename,
          mimetype: mime,
          caption: `✦ ${filename}`,
        },
        { quoted: m }
      )
    } catch (e) {
      console.log('[mediafire]', e.message)
      m.reply('❌ No se pudo obtener el archivo. Revisa que el link sea válido y público.')
    }
  },
}
