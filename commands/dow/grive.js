import axios from 'axios';

export default {
  command: ['drive', 'gdrive'],
  category: 'downloader',
  run: async ({client, m, args}) => {
    if (!args[0]) {
      return m.reply(
        'ꕥ Ingresa el *URL* de *Google Drive*.',
      )
    }

    const url = args[0]
    const key = api.key

    if (!url.match(/drive\.google\.com\/(file\/d\/|open\?id=|uc\?id=)/)) {
      return m.reply('ꕥ La URL no es de Google Drive.')
    }

   // await m.reply(mess.wait)

    try {
      const response = await axios.get(`${api.url}/dow/gdrive`, {
        params: { url, key },
      })

      const json = response.data

      if (!json.status || !json.data?.dl) {
        return m.reply('ꕥ No se pudo obtener el archivo. Intenta con otro *URL*.')
      }

      const { fileName, fileSize, mimetype, dl } = json.data

      const caption =
        `乂 𝖦oogle 𝖣𝗋𝗂𝗏𝖾 乂۟\n\n` +
        `✰ *Nombre* › ${fileName}\n` +
        `✰ *Tamaño* › ${fileSize}\n` +
        `✰ *Tipo* › ${mimetype}\n\n` +
        dev

      await client.sendContextInfoIndex(m.chat, caption, {}, m, true, null, {
        banner: 'https://files.catbox.moe/sxt0he.jpeg',
        title: '❀ Google - Drive ❀',
        body: '✰ Google Drive descargas ✿',
        redes: global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].link,
      })

      await client.sendMessage(
        m.chat,
        {
          document: { url: dl },
          mimetype,
          fileName,
          // caption
        },
        { quoted: m },
      )
    } catch (e) {
      console.error(e)
      m.reply(msgglobal)
    }
  },
};
