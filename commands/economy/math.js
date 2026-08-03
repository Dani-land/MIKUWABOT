import fs from 'fs';
import { normalizeJid, sameJid } from '../../lib/utils.js'

global.math = global.math || {};

const limits = {
  facil: 10,
  medio: 50,
  dificil: 90,
  imposible: 100,
  imposible2: 160
};

const generateRandomNumber = (max) => Math.floor(Math.random() * max) + 1;
const getOperation = () => ['+', '-', '×', '÷'][Math.floor(Math.random() * 4)];

const generarProblema = (dificultad) => {
  const maxLimit = limits[dificultad] || 30;
  const num1 = generateRandomNumber(maxLimit);
  const num2 = generateRandomNumber(maxLimit);
  const operador = getOperation();

  const resultado = eval(
    `${num1} ${operador === '×' ? '*' : operador} ${num2}`
  );

  return {
    problema: `${num1} ${operador} ${num2}`,
    resultado: operador !== '÷'
      ? resultado
      : resultado.toFixed(2)
  };
};

async function run({ client, m, args, command, prefa }) {

  const chatId = m.chat;
  const db = global.db.data.chats[chatId];
  const user = global.db.data.users[m.sender];
  const juego = global.math[chatId];

  if (db.adminonly || !db.rpg) {
    return m.reply(
      `✦ Los juegos de economía están desactivados en este grupo.`
    );
  }

  if (command === 'responder') {

    if (!juego?.juegoActivo) return;

    const quotedId =
      m.quoted?.key?.id ||
      m.quoted?.id ||
      m.quoted?.stanzaId;

    if (quotedId !== juego.problemMessageId) return;

    const respuestaUsuario = args[0]?.toLowerCase();

    if (!respuestaUsuario) {
      return client.reply(
        chatId,
        `✦ Escribe una respuesta válida.\n\nEjemplo:\n> *${prefa}responder 42*`,
        m
      );
    }

    const respuestaCorrecta = juego.respuesta;

    const botId = normalizeJid(client.user.id)

    const primaryBotId = db.primaryBot;

    if (!primaryBotId || sameJid(primaryBotId, botId)) {

      if (respuestaUsuario === respuestaCorrecta) {

        const expaleatorio =
          Math.floor(Math.random() * 50) + 10;

        user.exp += expaleatorio;

        clearTimeout(juego.tiempoLimite);
        delete global.math[chatId];

        return client.reply(
          chatId,
          `✦ ¡Respuesta correcta!\n\n> Ganaste *${expaleatorio} Exp* ✨`,
          m
        );

      } else {

        juego.intentos += 1;

        if (juego.intentos >= 3) {

          clearTimeout(juego.tiempoLimite);
          delete global.math[chatId];

          return client.reply(
            chatId,
            `✦ Te quedaste sin intentos.\n> Inténtalo nuevamente más tarde.`,
            m
          );

        } else {

          const intentosRestantes =
            3 - juego.intentos;

          return client.reply(
            chatId,
            `✦ Respuesta incorrecta.\n> Intentos restantes: *${intentosRestantes}*`,
            m
          );
        }
      }
    }

    return;
  }

  if (command === 'math') {

    if (juego?.juegoActivo) {
      return client.reply(
        chatId,
        `✦ Ya hay una partida activa en este grupo.`,
        m
      );
    }

    const dificultad = args[0]?.toLowerCase();

    if (!limits[dificultad]) {
      return client.reply(
        chatId,
        `✦ Elige una dificultad válida:\n\n> facil\n> medio\n> dificil\n> imposible\n> imposible2`,
        m
      );
    }

    const { problema, resultado } =
      generarProblema(dificultad);

    const problemMessage = await client.reply(
      chatId,
      `✦ Desafío Matemático ✦

> Dificultad: *${dificultad}*
> Tiempo límite: *1 minuto*

✧ Resuelve la operación:

> *${problema}*

Responde usando:
> *${prefa}responder resultado*`,
      m
    );

    globalThis.math[chatId] = {
      juegoActivo: true,
      problema,
      respuesta: resultado.toString(),
      intentos: 0,
      timeout: Date.now() + 60000,
      problemMessageId: problemMessage.key?.id,

      tiempoLimite: setTimeout(() => {

        if (global.math[chatId]?.juegoActivo) {

          delete globalThis.math[chatId];

          client.reply(
            chatId,
            `✦ Se acabó el tiempo.\n> El desafío matemático finalizó.`,
            m
          );
        }

      }, 60000)
    };
  }
}

export default {
  command: ['math', 'matematicas', 'responder'],
  category: 'rpg',
  run
};