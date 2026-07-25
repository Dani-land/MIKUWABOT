export default {
  command: ['w', 'work'],
  category: 'rpg',

  run: async ({client, m}) => {
    const chat = global.db.data.chats[m.chat];
    const user = chat.users[m.sender];
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const monedas = global.db.data.settings[botId].currency;

    if (chat.adminonly || !chat.rpg)
      return m.reply(`✦ Los comandos de economía están desactivados en este grupo.`)

    if (!user.workCooldown) user.workCooldown = 0;

    const remainingTime = user.workCooldown - Date.now();

    if (remainingTime > 0) {
      return m.reply(
        `⌛ Ya trabajaste recientemente.\n\n✦ Debes esperar:\n> *${msToTime(remainingTime)}*`
      );
    }

    const rsl = Math.floor(Math.random() * 5000);

    user.workCooldown = Date.now() + 10 * 60 * 1000;
    user.coins += rsl;

    await client.sendMessage(
      m.chat,
      {
        text: `╭─〔 💼 TRABAJO COMPLETADO 〕─╮

✦ ${pickRandom(trabajo)}

> +¥${rsl.toLocaleString()} ${monedas}

📈 Tu esfuerzo dio buenos resultados.

╰────────────────╯`
      },
      { quoted: m }
    );
  }
};

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);

  const min = minutes < 10 ? '0' + minutes : minutes;
  const sec = seconds < 10 ? '0' + seconds : seconds;

  return min === '00'
    ? `${sec} segundo${sec > 1 ? 's' : ''}`
    : `${min} minuto${min > 1 ? 's' : ''}, ${sec} segundo${sec > 1 ? 's' : ''}`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const trabajo = [
  "Trabajaste como recolector de fresas y recibiste",
  "Diseñaste una página web y ganaste",
  "Trabajaste en una cafetería y obtuviste",
  "Fuiste fotógrafo en un evento y recibiste",
  "Preparaste sushi en un restaurante y ganaste",
  "Trabajaste como repartidor y conseguiste",
  "Hiciste un mural artístico y te pagaron",
  "Trabajaste como DJ en una fiesta y obtuviste",
  "Fuiste mecánico por un día y recibiste",
  "Creaste contenido viral en redes y ganaste",
  "Trabajaste en una librería y obtuviste",
  "Ayudaste en un refugio de animales y recibiste",
  "Fuiste conductor turístico y ganaste",
  "Trabajaste como barista y obtuviste",
  "Hiciste un diseño gráfico y recibiste",
  "Trabajaste en un taller mecánico y ganaste",
  "Fuiste guía de montaña y obtuviste",
  "Trabajaste como chef personal y recibiste",
  "Organizaste un evento y ganaste",
  "Trabajaste como editor de videos y obtuviste"
];