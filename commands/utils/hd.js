import sharp from 'sharp'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'

export default {
  command: ['hd', 'enhance', 'hdphoto', 'mejorar'],
  category: 'utils',

  run: async ({ client, m }) => {
    try {
      const q = m.quoted || m
      const mime = (q.msg || q).mimetype || ''

      if (!/image\/(jpeg|jpg|png|webp)/i.test(mime)) {
        return client.reply(
          m.chat,
          '✐ Responde a una imagen para mejorar su calidad en HD.',
          m
        )
      }

      await client.sendMessage(m.chat, {
        react: { text: '🕒', key: m.key }
      })

      const stream = await downloadContentFromMessage(
        q.msg || q.message,
        'image'
      )

      let buffer = Buffer.alloc(0)

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }

      if (!buffer.length) {
        await client.sendMessage(m.chat, {
          react: { text: '✘', key: m.key }
        })

        return client.reply(
          m.chat,
          '✘ No pude descargar la imagen.',
          m
        )
      }

      const hdBuffer = await sharp(buffer)
        .resize({
          width: 2000,
          withoutEnlargement: false
        })
        .jpeg({ quality: 100 })
        .toBuffer()

      await client.sendMessage(
        m.chat,
        {
          image: hdBuffer,
          caption: '✦ Imagen mejorada en HD correctamente.'
        },
        { quoted: m }
      )

      await client.sendMessage(m.chat, {
        react: { text: '✓', key: m.key }
      })

    } catch (err) {
      console.error('Error en hd:', err)

      try {
        await client.sendMessage(m.chat, {
          react: { text: '✘', key: m.key }
        })
      } catch {}

      client.reply(
        m.chat,
        '✘ Ocurrió un error al mejorar la imagen.',
        m
      )
    }
  }
}