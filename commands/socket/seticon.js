import fetch from 'node-fetch';
import FormData from 'form-data';

async function uploadImageCatbox(buffer, mime) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', buffer, {
    filename: `icon.${mime.split('/')[1] || 'png'}`,
    contentType: mime
  });

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form
  });

  const url = await res.text();

  if (!url.startsWith('https://')) {
    throw new Error('Falló la subida a Catbox: ' + url);
  }

  return url;
}

export default {
  command: ['seticon'],
  category: 'socket',
  run: async ({client, m, args}) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const config = global.db.data.settings[idBot];

    const isOwner2 = [
      idBot,
      ...global.owner.map((number) => number + '@s.whatsapp.net')
    ].includes(m.sender);

    if (!isOwner2 && m.sender !== owner)
      return m.reply(mess.socket);

    const value = args.join(' ').trim();

    if (!value && !m.quoted && !m.message.imageMessage) {
      return m.reply(
`✦ Debes enviar o responder una imagen para cambiar el icono del bot.

✐ Ejemplo:
> ${prefa}seticon`
      );
    }

    if (value.startsWith('http')) {
      config.icon = value;

      return m.reply(
`✦ El icono de *${config.namebot2}* fue actualizado correctamente.`
      );
    }

    const q = m.quoted ? m.quoted : m.message.imageMessage ? m : m;
    const mime = (q.msg || q).mimetype || q.mediaType || '';

    if (!/image\/(png|jpe?g|gif)/.test(mime)) {
      return m.reply(
`✦ Solo puedes usar imágenes válidas.

✐ Formatos permitidos:
> png, jpg, jpeg o gif`
      );
    }

    const media = await q.download();

    if (!media)
      return m.reply('✦ No se pudo descargar la imagen.');

    const link = await uploadImageCatbox(media, mime);

    config.icon = link;

    return m.reply(
`✦ El nuevo icono de *${config.namebot2}* se actualizó con éxito.`
    );
  },
};