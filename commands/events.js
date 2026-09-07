import chalk from 'chalk'
import {
    resolveLidToRealJid,
    normalizeJid,
    sameJid,
} from '../lib/utils.js'

const groupMetadataCache = new Map()
const groupMetadataRequests = new Map()

async function getGroupMetadata(client, groupId) {
    const cached = groupMetadataCache.get(groupId)
    if (cached && Date.now() - cached.timestamp < 60 * 1000) {
        return cached.metadata
    }

    if (groupMetadataRequests.has(groupId)) {
        return groupMetadataRequests.get(groupId)
    }

    const request = Promise.race([
        client.groupMetadata(groupId).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]).then((metadata) => {
        if (metadata) {
            groupMetadataCache.set(groupId, {
                metadata,
                timestamp: Date.now(),
            })
        }
        return metadata || (cached && cached.metadata) || null
    }).finally(() => {
        groupMetadataRequests.delete(groupId)
    })

    groupMetadataRequests.set(groupId, request)
    return request
}

export const participantsUpdate = async (client, anu) => {
    try {
        if (!anu?.id || !anu.id.endsWith('@g.us')) return

        if (!global.db.data.chats[anu.id]) {
            global.db.data.chats[anu.id] = {}
        }
        const chat = global.db.data.chats[anu.id]
        if (typeof chat.welcome !== 'boolean') chat.welcome = true
        if (typeof chat.alerts !== 'boolean') chat.alerts = true

        const metadata = await getGroupMetadata(client, anu.id) || {
            subject: 'este grupo',
            participants: [],
        }
        const botId = normalizeJid(client.user.id)
        const primaryBotId = chat?.primaryBot
        const isPrimary = !primaryBotId || sameJid(primaryBotId, botId)

        const entries = Array.isArray(anu.participants) ? anu.participants : []
        const metadataCount = metadata.participants.length
        const memberCount = metadataCount > 0 ? metadataCount : entries.length

        for (const entry of entries) {
            const participant = typeof entry === 'string' ? { id: entry } : (entry || {})
            const originalJid = participant.id || participant.lid || participant.phoneNumber
            if (!originalJid) continue

            let jid = await resolveLidToRealJid(originalJid, client, anu.id)
            if (jid?.endsWith('@lid') && participant.phoneNumber) {
                jid = participant.phoneNumber
            }
            const mentionJid = jid || originalJid
            const phone = mentionJid.split('@')[0]
            const pushName = participant.pushName || 'Usuario'

            const pp = await client.profilePictureUrl(jid, 'image').catch(_ => 'https://files.catbox.moe/sxt0he.jpeg')

            // ==================== BIENVENIDA ====================
            if (anu.action === 'add' && chat?.welcome && isPrimary) {
                const caption = `✿ Bienvenido✿\n\n` +
                    `ᰔᩚ ${pushName}\n` +
                    `ꕤ Grupo ›⠀⠀${metadata.subject}\n` +
                    `ʕ·ᴥ·ʔ Miembros ›⠀${memberCount}\n\n` +
                    `ꕤ Usa *#menu* para ver todos los comandos`

                await client.sendMessage(anu.id, {
                    image: { url: pp },
                    caption: caption,
                    mentions: [mentionJid],
                })
            }

            // ==================== DESPEDIDA ====================
            if ((anu.action === 'remove' || anu.action === 'leave') && chat?.welcome && isPrimary) {
                const caption = `❀ Hasta luego❀\n\n` +
                    `ᰔᩚ ${pushName}\n` +
                    `ʕ·ᴥ·ʔ Miembros ›⠀${memberCount}\n\n` +
                    `✿ Esperamos verte pronto`

                await client.sendMessage(anu.id, {
                    image: { url: pp },
                    caption: caption,
                    mentions: [mentionJid],
                })
            }

            // ==================== PROMOTE / DEMOTE ====================
            if (anu.action === 'promote' && chat?.alerts && isPrimary) {
                const usuario = anu.author
                await client.sendMessage(anu.id, {
                    text: `✧ @\( {phone} ha sido promovido a *Administrador* por @ \){usuario?.split('@')[0] || 'Sistema'}.`,
                    mentions: [jid, usuario].filter(Boolean)
                })
            }

            if (anu.action === 'demote' && chat?.alerts && isPrimary) {
                const usuario = anu.author
                await client.sendMessage(anu.id, {
                    text: `✧ @\( {phone} ha sido degradado de *Administrador* por @ \){usuario?.split('@')[0] || 'Sistema'}.`,
                    mentions: [jid, usuario].filter(Boolean)
                })
            }
        }
    } catch (err) {
        console.log(chalk.gray(`[ EVENT ERROR ]  → ${err}`))
    }
}