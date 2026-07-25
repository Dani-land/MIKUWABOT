import axios from 'axios'
import path from 'path'

function isMediafire(url) {
  try {
    return new URL(url).hostname.includes('mediafire.com')
  } catch {
    return false
  }
}

export default {
  command: ['mediafire', 'mf'],
  category: 'downloader',

  run: async ({ client, m, args }) => {
    if (!args[0]) return m.reply('✐ Envía un link de Mediafire o un nombre.')

    const input = args.join(' ')
    let url = input

    try {

      // 🔥 si no es link, buscar
      if (!isMediafire(input)) {
        const res = await axios.get(
          `https://api.dler.io/api/mediafire/search?query=${encodeURIComponent(input)}`
        )

        const data = res.data?.result
        if (!data?.length) return m.reply('ꕥ No se encontró nada.')

        url = data[0].link
      }

      // 🔥 API principal (rápida)
      let api = await axios.get(
        `https://api.dler.io/api/mediafire/download?url=${encodeURIComponent(url)}`,
        { timeout: 20000 }
      )

      let data = api.data

      // 🔁 fallback si falla
      if (!data?.download) {
        const alt = await axios.get(
          `https://api.bronxy.xyz/api/mediafire?url=${encodeURIComponent(url)}`
        )
        data = alt.data
      }

      if (!data?.download) {
        return m.reply('❌ No se pudo obtener el archivo.')
      }

      const fileUrl = data.download
      const title = data.filename || 'archivo'

      const ext = path.extname(title)

      const mime = {
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
        '.zip': 'application/zip',
        '.rar': 'application/vnd.rar',
        '.apk': 'application/vnd.android.package-archive',
        '.pdf': 'application/pdf'
      }[ext] || 'application/octet-stream'

      await client.sendMessage(m.chat, {
        document: { url: fileUrl },
        fileName: title,
        mimetype: mime
      }, { quoted: m })

    } catch (e) {
      console.log(e)
      m.reply('❌ Error al descargar Mediafire.')
    }
  }
}