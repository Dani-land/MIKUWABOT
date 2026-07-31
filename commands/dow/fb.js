import { igdl } from 'ruhend-scraper';

export default {
  command: ['fb', 'facebook'],
  category: 'downloader',
  run: async ({ client, m, args }) => {

    if (!args[0]) {
      return m.reply('✐ Ingresa el enlace de Facebook.');
    }

    if (!args[0].match(/facebook\.com|fb\.watch|video\.fb\.com/)) {
      return m.reply('✧ El enlace no es de Facebook');
    }

    try {
      await client.sendMessage(
        m.chat,
        { react: { text: '🍃', key: m.key } }
      );

      m.reply('ꕥ Se está probando su video de Facebook..._');

      const res = await igdl(args[0]);
      const result = res.data;

      if (!result || result.length === 0) {
        throw new Error('No se encontraron resultados.');
      }

      // Prioridad HD → SD
      const video =
        result.find(v => v.resolution === '720p (HD)') ||
        result.find(v => v.resolution === '360p (SD)');

      if (!video) {
        throw new Error('No se encontró una resolución válida.');
      }

      const caption = `*乂 FACEBOOK - DOWNLOAD 乂*

✰ *Enlace:*  
${args[0]}`;

      await client.sendMessage(
        m.chat,
        {
          video: { url: video.url },
          caption,
          mimetype: 'video/mp4',
          fileName: 'facebook.mp4'
        },
        { quoted: m }
      );

    } catch (e) {
      m.reply('ꕥ Error: ' + e.message);
    }
  }
};