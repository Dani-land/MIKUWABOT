import fs from 'fs'

export default {
  command: ['wm', 'watermark'],
  category: 'utils',

  run: async ({ client, m, text, command, usedPrefix }) => {
    try {
      const q = m.quoted ? m.quoted : m
      const mime = (q.msg || q).mimetype || ''

      if (!/webp/.test(mime)) {
        return m.reply(
          `✐ Responde a un sticker usando:\n> *${usedPrefix + command} Pack | Autor*`
        )
      }

      let packname = 'Sticker Pack'
      let author = m.pushName || 'Miku Wabot'

      if (text) {
        if (text.includes('|')) {
          const [p, a] = text.split('|')

          packname = p.trim() || packname
          author = a.trim() || author
        } else {
          packname = text.trim()
        }
      } else {
        return m.reply(
          `✧ Escribe el nombre del pack y autor.\n\n✦ Ejemplo:\n> *${usedPrefix + command} Miku Pack | Daniel*`
        )
      }

      const media = await q.download()

      if (!media) {
        throw new Error('No se pudo descargar el sticker.')
      }

      await client.sendImageAsSticker(
        m.chat,
        media,
        m,
        {
          packname,
          author
        }
      )

      await client.sendMessage(m.chat, {
        react: {
          text: '✨',
          key: m.key
        }
      })

    } catch (e) {
      console.error(e)

      m.reply(
        `✘ Error al aplicar watermark.\n> ${e.message}`
      )
    }
  }
}