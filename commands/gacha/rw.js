import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

const obtenerImagen = async (keyword) => {
  // Safebooru: imageboard con contenido clasificado como seguro (rating=safe)
  const tag = encodeURIComponent(String(keyword).trim().replace(/\s+/g, '_'));
  const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&limit=50`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NyxDLaPI/1.0' },
    });

    if (!res.ok) {
      console.error(`[Error] Safebooru devolvió status ${res.status}`);
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!Array.isArray(data) || data.length === 0) return null;

    const posts = data.filter((p) => p?.image && p?.directory);
    if (!posts.length) return null;

    const elegido = posts[Math.floor(Math.random() * posts.length)];
    return `https://safebooru.org//images/${elegido.directory}/${elegido.image}`;
  } catch (err) {
    console.error(`[Error] Fallo al obtener imagen de Safebooru:`, err);
    return null;
  }
};

const obtenerPersonajes = () => {
  try {
    const contenido = fs.readFileSync('./lib/characters.json', 'utf-8');
    return JSON.parse(contenido);
  } catch (error) {
    console.error('[Error] characters.json:', error);
    return [];
  }
};

const reservarPersonaje = (chatId, userId, personaje, db) => {
  if (!db.chats[chatId].personajesReservados) db.chats[chatId].personajesReservados = [];
  db.chats[chatId].personajesReservados.push({ userId, ...personaje });
};

const msToTime = (duration) => {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const s = seconds.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  return m === '00'
    ? `${s} segundo${seconds !== 1 ? 's' : ''}`
    : `${m} minuto${minutes !== 1 ? 's' : ''}, ${s} segundo${seconds !== 1 ? 's' : ''}`;
};

export default {
  command: ['rollwaifu', 'roll', 'rw', 'rf'],
  category: 'gacha',
  run: async ({ client, m, args }) => {
    const db = global.db.data;
    const chatId = m.chat;
    const userId = m.sender;

    if (!db.chats[chatId]) db.chats[chatId] = {};
    const chat = db.chats[chatId];
    if (!chat.users) chat.users = {};

    if (chat.adminonly || !chat.gacha) {
      return m.reply(`✎ Estos comandos están desactivados en este grupo.`);
    }

    const user = chat.users[userId] || (chat.users[userId] = {});
    const now = Date.now();
    const cooldown = user.rwCooldown || 0;
    const restante = cooldown - now;

    if (restante > 0) {
      return m.reply(`ꕥ Espera *${msToTime(restante)}* para volver a usar este comando.`);
    }

    const personajes = obtenerPersonajes();
    if (!personajes.length) return m.reply('《✧》 No hay personajes cargados en characters.json.');

    const personaje = personajes[Math.floor(Math.random() * personajes.length)];
    if (!personaje) return m.reply('《✧》 No se encontró ningún personaje disponible.');

    try {
      const poseedor = Object.entries(chat.users).find(
        ([_, u]) => Array.isArray(u.characters) && u.characters.some((c) => c.name === personaje.name)
      );

      const reservado = Array.isArray(chat.personajesReservados)
        ? chat.personajesReservados.find((p) => p.name === personaje.name)
        : null;

      let estado = 'Libre';
      if (poseedor) {
        estado = `Reclamado por ${db.users[poseedor[0]]?.name || 'Alguien'}`;
      } else if (reservado) {
        estado = `Reservado por ${db.users[reservado.userId]?.name || 'Alguien'}`;
      }

      // Intenta con el keyword/nombre del personaje; si no hay resultados,
      // reintenta solo con la primera palabra del nombre (más flexible)
      let imagenUrl = await obtenerImagen(personaje.keyword || personaje.name);
      if (!imagenUrl && personaje.name) {
        const primeraPalabra = personaje.name.split(' ')[0];
        imagenUrl = await obtenerImagen(primeraPalabra);
      }

      if (!imagenUrl) {
        return m.reply(`No se pudo obtener una imagen para *${personaje.name || 'este personaje'}*. Intenta de nuevo.`);
      }

      const mensaje = `✰ Nombre › *${personaje.name || 'Desconocido'}*
⚥ Género › *${personaje.gender || 'Desconocido'}*
⛁ Valor › *${personaje.value?.toLocaleString() || '0'}*
♡ Estado › *${estado}*
❀ Fuente › *${personaje.source || 'Desconocido'}*`;

      await client.sendMessage(chatId, {
        image: { url: imagenUrl },
        caption: mensaje
      }, { quoted: m });
      user.rwCooldown = now + 15 * 60000;

      if (!poseedor) {
        reservarPersonaje(chatId, userId, {
          ...personaje,
          id: uuidv4().slice(0, 8),
          reservedBy: userId,
          expiresAt: now + 60000,
        }, db);
      }
    } catch (e) {
      console.error(e);
      return m.reply(`Error: ${e.message}. Reportar al creador del Bot.`);
    }
  },
};
