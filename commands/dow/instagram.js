import fetch from 'node-fetch';

const SENKO_API = 'https://senko-apiserverg5.onrender.com'

export default {
  command: ['instagram', 'ig'],
  category: 'downloader',

  run: async ({client, m, args, command}) => {

    const url = args[0]

    if (!url) {
      return m.reply('✐ Ingresa algún *URL* de *Instagram*.')
    }

    if (!url.match(/instagram\.com\/(p|reel|share|tv)\//)) {
      return m.reply('✐ Asegúrate que el *URL* sea de *Instagram*')
    }

    try {

      const res = await fetch(
        `${SENKO_API}/api/instagram?url=${encodeURIComponent(url)}`
      )

      const json = await res.json()

      console.log('SENKO IG RESPONSE:', json)

      const media =
        json?.download ||
        json?.dl ||
        json?.url ||
        json?.result?.download ||
        json?.result?.url ||
        json?.data?.download ||
        json?.data?.url ||
        json?.media?.url ||
        json?.mediaUrls?.[0]

      if (!media) {
        return client.reply(
          m.chat,
          'ꕥ No se pudo *obtener* el contenido de Instagram',
          m
        )
      }

      const type =
        (json?.type || json?.data?.type || '').includes('video')
          ? 'video'
          : 'image'

      const title =
        json?.title ||
        json?.username ||
        json?.author ||
        json?.data?.username ||
        'Instagram'

      const like =
        json?.like ||
        json?.likes ||
        json?.data?.like ||
        json?.data?.likes ||
        null

      const comment =
        json?.comment ||
        json?.comments ||
        json?.data?.comment ||
        json?.data?.comments ||
        null

      const caption =
        `*INSTAGRAM*

✰ *Titulo* › ${title}
✿ *Likes* › ${like || 'N/A'}
✰ *Comentarios* › ${comment || 'N/A'}
✿ *Tipo* › ${type}
✰ *Enlace* › ${url}\n♡ *Api:* » https://senko-apiserverg5.onrender.com/
`.trim()

      await client.sendMessage(
        m.chat,
        {
          [type]: { url: media },
          caption
        },
        { quoted: m }
      )

    } catch (e) {

      console.log(e)

      await client.reply(
        m.chat,
        'ꕥ Error al procesar Instagram (Senko API falló)',
        m
      )
    }
  }
};