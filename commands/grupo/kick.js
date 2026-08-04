import { resolveLidToRealJid, normalizeJid, sameJid } from '../../lib/utils.js'

export default {
  command: ['kick'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async ({client, m, args}) => {
    if (!m.mentionedJid[0] && !m.quoted) {
      return m.reply('✐ Etiqueta o cita el *mensaje* de la *persona* que quieres eliminar')
    }

    const requestedUser = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted.sender

    const groupInfo = await client.groupMetadata(m.chat)
    const participants = groupInfo.participants || []

    const participantMatches = (participant, jid) => {
      const identities = [
        participant?.id,
        participant?.lid,
        participant?.phoneNumber,
      ].filter(Boolean)

      return identities.some(identity => sameJid(identity, jid))
    }

    let participant = participants.find(
      (candidate) => participantMatches(candidate, requestedUser)
    )

    // Si el mensaje trae un LID que no coincide directamente, resolverlo
    // usando la tabla PN↔LID de Baileys y volver a buscar al participante.
    const resolvedUser = normalizeJid(
      await resolveLidToRealJid(requestedUser, client, m.chat)
    )
    if (!participant) {
      participant = participants.find(
        (candidate) => participantMatches(candidate, resolvedUser)
      )
    }

    if (!participant) {
      return client.reply(m.chat, `《✧》 *@${requestedUser.split('@')[0]}* ya no está en el grupo.`, m, {
        mentions: [requestedUser],
      })
    }

    // phoneNumber es el JID real cuando WhatsApp entrega id como @lid.
    const user = normalizeJid(
      await resolveLidToRealJid(
        participant.phoneNumber || participant.id,
        client,
        m.chat
      )
    )
    const ownerGroup = normalizeJid(
      groupInfo.owner || m.chat.split`-`[0] + '@s.whatsapp.net'
    )
    const ownerBot = (global.owner || []).map(normalizeJid)

    if (sameJid(user, client.user.id) || sameJid(user, client.user.lid)) {
      return m.reply('《✧》 No puedo eliminar al *bot* del grupo')
    }

    if (sameJid(user, ownerGroup)) {
      return m.reply('《✧》 No puedo eliminar al *propietario* del grupo')
    }

    if (ownerBot.some(owner => sameJid(user, owner))) {
      return m.reply('《✧》 No puedo eliminar al *propietario* del bot')
    }

    try {
      await client.groupParticipantsUpdate(m.chat, [user], 'remove')
      client.reply(m.chat, `✎ @${user.split('@')[0]} *eliminado* correctamente`, m, {
        mentions: [user],
      })
    } catch (e) {
      // console.error(e)
      m.reply(msgglobal)
    }
  },
};
