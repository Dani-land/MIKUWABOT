import { resolveLidToRealJid, normalizeJid, sameJid } from "../../lib/utils.js"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const getBotsFromFolder = (folderName) => {
  const basePath = path.join(dirname, '../../Sessions', folderName)
  if (!fs.existsSync(basePath)) return []
  return fs
    .readdirSync(basePath)
    .filter((dir) => fs.existsSync(path.join(basePath, dir, 'creds.json')))
    .map((id) => normalizeJid(id))
}

const getAllowedBots = (mainBotJid) => {
  const subs = getBotsFromFolder('Subs')
  const mods = getBotsFromFolder('Mods')
  const prems = getBotsFromFolder('Prems')
  const connectedSockets = (global.conns || [])
    .map((socket) => socket?.userId || socket?.user?.id)
    .filter(Boolean)
    .map(normalizeJid)
  return [...new Set([...subs, ...mods, ...prems, connectedSockets, mainBotJid].flat().filter(Boolean))]
}

const getParticipantJids = async (participants, client, groupJid) => {
  const identities = participants.flatMap((participant) => [
    participant?.id,
    participant?.lid,
    participant?.phoneNumber,
  ]).filter(Boolean)

  const resolved = await Promise.all(
    identities.map((identity) => resolveLidToRealJid(identity, client, groupJid))
  )

  return [...new Set(
    [...identities, ...resolved]
      .map(normalizeJid)
      .filter(Boolean)
  )]
}

export default {
  command: ['setprimary'],
  category: 'grupo',
  isAdmin: true,

  run: async ({client, m, args}) => {
    try {
      const chat = global.db.data.chats[m.chat]
      const mentioned = m.mentionedJid
      const who2 = mentioned.length > 0 ? mentioned[0] : m.quoted?.sender || false
      const who = normalizeJid(await resolveLidToRealJid(who2, client, m.chat));
      if (!who2) {
        return client.reply(m.chat, `《✧》 Por favor menciona un bot para convertirlo en primario.`, m)
      }
      const groupMetadata = m.isGroup
        ? await client.groupMetadata(m.chat).catch(() => null)
        : null
      const groupParticipants = await getParticipantJids(
        groupMetadata?.participants || [],
        client,
        m.chat
      )

       const mainBotJid = normalizeJid(global.client?.user?.id)
      const allowedBots = getAllowedBots(mainBotJid)

       if (!allowedBots.some((botJid) => sameJid(botJid, who))) {
        return client.reply(m.chat, `《✧》 El usuario mencionado no es un socket MikuBot.`, m)
      }

       if (!groupParticipants.some((participantJid) => sameJid(participantJid, who))) {
        return client.reply(m.chat, `《✧》 El bot mencionado no está presente en este grupo.`, m)
      }

       if (sameJid(chat.primaryBot, who)) {
        return client.reply(m.chat, `「✿」 @${who.split('@')[0]} ya es el Bot principal del Grupo.`, m, {
          mentions: [who],
        })
      }

      chat.primaryBot = who
      await client.reply(
        m.chat,
        `ꕥ Se ha establecido a @${who.split('@')[0]} como bot primario de este grupo.\n> Ahora todos los comandos de este grupo serán ejecutados por @${who.split('@')[0]}.`,
        m,
        { mentions: [who] },
      )
    } catch (e) {
      console.error(e)
      await m.reply(`《✧》 Ocurrió un error al intentar establecer el bot primario.`)
    }
  },
};
