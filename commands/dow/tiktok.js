import fetch from 'node-fetch';

export default {
command: ['tiktok', 'tt'],
category: 'downloader',

run: async ({ client, m, args }) => {

if (!args.length || !args[0].includes("tiktok.com")) {
  return m.reply(
    `✎ Ingresa algún *URL* válido de TikTok.\n\nEjemplo: *#tiktok* https://vt.tiktok.com/...`
  );
}

const url = args[0];

try {
  const apiUrl =
    `https://senko-apiserverg5.onrender.com/api/tiktok?url=${encodeURIComponent(url)}`;

  const res = await fetch(apiUrl);

  if (!res.ok) {
    throw new Error(`Error en el servidor: ${res.status}`);
  }

  const json = await res.json();

  if (!json.download_url) {
    return m.reply(
      `ꕥ No se pudo obtener el video. Verifica que el enlace sea público.`
    );
  }

  const caption = `✰ TikTok ✰

⌗ Usuario: ${json.author || 'Desconocido'}
⌗ Descripción: ${json.title || 'Sin descripción'}

⌗ Api: https://senko-apiserverg5.onrender.com`;

  await client.sendMessage(
    m.chat,
    {
      video: {
        url: json.download_url
      },
      caption
    },
    {
      quoted: m
    }
  );

} catch (e) {
  console.error(e);

  await m.reply(
    "ꕥ El servicio no está disponible en este momento."
  );
}

},
};