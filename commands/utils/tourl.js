import uploadImage from '../../lib/uploadImage.js';
import fetch from 'node-fetch';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

export default {
  command: ['tourl'],
  category: 'utils',

  run: async (client, m, args, usedPrefix, command) => {
    try {
      const botId = ((client.user?.id || client.user?.jid || '').split(':')[0] || '') + '@s.whatsapp.net';
      const botSettings = global.db?.data?.settings?.[botId] || {};
      const botname = botSettings.namebot2 || 'Miku Wabot';

      const prefix = usedPrefix || '.';
      const q = m.quoted || m;
      const mime = (q.msg || q).mimetype || q.mimetype || '';

      if (!mime) {
        return m.reply(`✐ Responde a una imagen, video o audio con *${prefix}tourl* para convertirlo en enlace.`);
      }

      const isMedia = /^(image\/(png|jpe?g|gif|webp)|video\/mp4|audio\/(mpeg|mp3|wav|ogg|opus))$/i.test(mime);

      if (!isMedia) {
        return m.reply('✘ Solo se permiten imágenes, videos y audios compatibles.');
      }

      await client.sendMessage(m.chat, {
        react: { text: '🌐', key: m.key }
      });

      const media = await q.download();
      if (!media) {
        throw new Error('No se pudo descargar el archivo citado');
      }

      const link = await uploadImage(media);
      if (!link || !/^https?:\/\//i.test(link)) {
        throw new Error('No se pudo generar el enlace');
      }

      let img = null;

      if (/^image\//i.test(mime)) {
        const res = await fetch(link);
        if (!res.ok) {
          throw new Error(`Error al descargar archivo: ${res.status}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        img = Buffer.from(arrayBuffer);
      }

      let shortLink = 'No disponible';

      try {
        const shortRes = await fetch(
          `https://tinyurl.com/api-create.php?url=${encodeURIComponent(link)}`
        );

        if (shortRes.ok) {
          shortLink = (await shortRes.text()).trim() || 'No disponible';
        }
      } catch (shortError) {
        console.error('Error al acortar URL:', shortError);
      }

      const txt = `
╭─〔 🌐 Enlace Generado 〕─⬣
│ ✦ Tipo › ${mime}
│ ✦ Tamaño › ${formatBytes(media.length)}
│ ✦ Expira › Nunca
│
│ ✧ URL
│ ${link}
│
│ ✧ URL Corta
│ ${shortLink}
╰────────────⬣

✦ ${botname}
`.trim();

      if (img) {
        await client.sendMessage(
          m.chat,
          {
            image: img,
            caption: txt
          },
          { quoted: m }
        );
      } else {
        await client.sendMessage(
          m.chat,
          {
            text: txt
          },
          { quoted: m }
        );
      }

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });
    } catch (e) {
      console.error('Error en tourl:', e);

      await client.sendMessage(m.chat, {
        react: { text: '✘', key: m.key }
      });

      return m.reply(`✘ Ocurrió un error al procesar el archivo.\n> ${e.message}`);
    }
  }
};