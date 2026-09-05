import fetch from 'node-fetch'
import FormData from 'form-data'
import { isSocketOwner } from '../../lib/utils.js'

const NYXDL_UPLOAD =
  'https://nyxdlapi.vercel.app/api/tools/tourl?apikey=nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'

async function uploadToNyxDL(buffer, mime) {
  const ext = (mime && mime.split('/')[1]) || 'bin'
  const form = new FormData()

  form.append('file', buffer, {
    filename: 'banner.' + ext,
    contentType: mime || 'application/octet-stream',
  })

  const res = await fetch(NYXDL_UPLOAD, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error('NyxDL HTTP ' + res.status + ': ' + text.slice(0, 180))
  }

  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error('NyxDL no devolvió JSON: ' + text.slice(0, 180))
  }

  if (!data || !data.status) {
    throw new Error((data && data.message) || 'Falló la subida a NyxDL')
  }

  const file =
    data.result && data.result.files && data.result.files[0]
      ? data.result.files[0]
      : null

  const url =
    (file && (file.url || file.shortUrl)) ||
    (data.result && (data.result.url || data.result.shortUrl)) ||
    null

  if (!url || !String(url).startsWith('http')) {
    throw new Error('NyxDL no devolvió una URL válida')
  }

  return url
}

export default {
  command: ['setbanner', 'setmenubanner'],
  category: 'socket',

  run: async function (ctx) {
    var client = ctx.client
    var m = ctx.m
    var args = ctx.args || []

    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]

    if (!isSocketOwner(client, m, config)) {
      return m.reply(mess.socket)
    }

    const value = args.join(' ').trim()

    if (!value && !m.quoted && !m.message.imageMessage && !m.message.videoMessage) {
      return m.reply(
        '⌗ 𝗦𝗘𝗧 • 𝗕𝗔𝗡𝗡𝗘𝗥\n\n' +
          '✦ Envía o responde una imagen/video.\n' +
          '✧ O pega un link directo.\n\n' +
          '❍ Ejemplo:\n> setbanner https://ejemplo.com/banner.jpg'
      )
    }

    if (value.startsWith('http')) {
      config.banner = value
      return m.reply(
        '⌗ 𝗕𝗔𝗡𝗡𝗘𝗥 • 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢\n\n' +
          '✦ Banner de *' +
          (config.namebot2 || 'el bot') +
          '* guardado.'
      )
    }

    const q = m.quoted
      ? m.quoted
      : m.message.imageMessage || m.message.videoMessage
        ? m
        : null

    if (!q) return m.reply('✦ Responde a una imagen/video o envía un link.')

    const mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!/image\/(png|jpe?g|gif|webp)|video\/mp4/.test(mime)) {
      return m.reply('✦ Usa JPG, PNG, GIF, WEBP o MP4.')
    }

    try {
      const media = await q.download()
      if (!media) return m.reply('✦ No se pudo descargar el archivo.')

      await m.reply('⏳ Subiendo banner...')

      const link = await uploadToNyxDL(media, mime)
      config.banner = link

      return m.reply(
        '⌗ 𝗕𝗔𝗡𝗡𝗘𝗥 • 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢\n\n' +
          '✦ Banner de *' +
          (config.namebot2 || 'el bot') +
          '* listo.\n' +
          '✧ Subido con NyxDL.\n\n' +
          link
      )
    } catch (e) {
      console.error('[setbanner]', e)
      return m.reply('✘ Error al subir el banner.\n\n> ' + e.message)
    }
  },
}