import chalk from 'chalk'
import {
    fetchIconBuffer,
    getCachedGroupMetadata,
    resolveLidToRealJid,
} from '../lib/utils.js'

export const participantsUpdate = async (client, anu) => {
    try {
        if (!anu?.id || !anu.id.endsWith('@g.us')) return

        // group-participants.update puede llegar antes que el primer mensaje
        // del grupo. En ese caso initDB aún no creó esta entrada.
        if (!global.db.data.chats[anu.id]) {
            global.db.data.chats[anu.id] = {}
        }
        const chat = global.db.data.chats[anu.id]
        if (typeof chat.welcome !== 'boolean') chat.welcome = true
        if (typeof chat.alerts !== 'boolean') chat.alerts = true

        // En grupos grandes groupMetadata puede tardar o fallar. El caché
        // deduplica las consultas y permite continuar con datos mínimos.
        const metadata = await getCachedGroupMetadata(client, anu.id) || {
            subject: 'este grupo',
            participants: [],
        }
        const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
        const primaryBotId = chat?.primaryBot

        // Baileys antiguo entrega strings; las versiones nuevas pueden
        // entregar objetos con id/lid/phoneNumber.
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
            const pp = await client.profilePictureUrl(jid, 'image').catch(_ => 'https://files.catbox.moe/sxt0he.jpeg')

            const botSettings = global.db.data.settings[botId] || {}
            // Descargar ícono como Buffer para que el thumbnail aparezca correctamente
            const _iconBuf = await fetchIconBuffer(botSettings.icon)
            const fakeContext = {
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: botSettings.id,
                        serverMessageId: '0',
                        newsletterName: botSettings.nameid
                    },
                    externalAdReply: {
                        title: botSettings.namebot,
                        body: global.dev || 'HatsuneMikuBot',
                        mediaUrl: null,
                        description: null,
                        previewType: 'PHOTO',
                        ...(_iconBuf ? { thumbnail: _iconBuf } : { thumbnailUrl: botSettings.icon }),
                        sourceUrl: botSettings.link,
                        mediaType: 1,
                        renderLargerThumbnail: false
                    },
                    mentionedJid: [mentionJid, anu.author].filter(Boolean)
                }
            }

            if (anu.action === 'add' && chat?.welcome && (!primaryBotId || primaryBotId === botId)) {
                const caption = `
╭┄┈┈┈֗┄፞┈֯┈፞┈֗┈┈┄┈─
┊╭ *Bienvenido ʕ⁠っ⁠•⁠ᴥ⁠•⁠ʔ⁠っ* ╯
┊ ︿︿︿︿︿︿︿︿︿︿︿
┊  *Usuario ›* @${phone}
┊  *Grupo ›* ${metadata.subject}
┊➤ *Usa #menu para ver los comandos.*
┊➤ *Ahora somos ${memberCount} miembros.*
┊ °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
╰─────────────────╯`
                await client.sendMessage(anu.id, { 
                    image: { url: pp }, 
                    caption: caption, 
                    mentions: [mentionJid],
                    ...fakeContext 
                })
            }
            if ((anu.action === 'remove' || anu.action === 'leave') && chat?.welcome && (!primaryBotId || primaryBotId === botId)) {
                const caption = `
╭ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ
┆╭ *Adiós (⁠｡⁠•́⁠︿⁠•̀⁠｡⁠)* ╯
┆┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ
┆ *Nombre* @${phone}
┆ *Hasta luego esperemos que regreses*
┊ ︿︿︿︿︿︿︿︿︿︿︿
┊ *Ahora somos ${memberCount} miembros.*_
╰─ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄ׂ`
                await client.sendMessage(anu.id, { 
                    image: { url: pp }, 
                    caption: caption, 
                    mentions: [mentionJid],
                    ...fakeContext 
                })
            }

            if (anu.action === 'promote' && chat?.alerts && (!primaryBotId || primaryBotId === botId)) {
                const usuario = anu.author
                await client.sendMessage(anu.id, {
                    text: `✎ *@${phone}* ha sido promovido a Administrador por *@${usuario?.split('@')[0] || 'Sistema'}.*`,
                    mentions: [jid, usuario].filter(Boolean)
                })
            }

            if (anu.action === 'demote' && chat?.alerts && (!primaryBotId || primaryBotId === botId)) {
                const usuario = anu.author
                await client.sendMessage(anu.id, {
                    text: `✎ *@${phone}* ha sido degradado de Administrador por *@${usuario?.split('@')[0] || 'Sistema'}.*`,
                    mentions: [jid, usuario].filter(Boolean)
                })
            }
        }
    } catch (err) {
        console.log(chalk.gray(`[ EVENT ERROR ]  → ${err}`))
    }
}
