import chalk from 'chalk'
import moment from 'moment-timezone'
import { fetchIconBuffer } from '../lib/utils.js'

export const participantsUpdate = async (client, anu) => {
    try {
        const metadata = await client.groupMetadata(anu.id)
        const chat = global.db.data.chats[anu.id]
        const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
        const primaryBotId = chat?.primaryBot

        const now = new Date()
        const colombianTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
        const tiempo = colombianTime.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/,/g, '')
        const tiempo2 = moment.tz('America/Bogota').format('hh:mm A')

        let memberCount = metadata.participants.length
 
        if (anu.action === 'add') memberCount += 1
        if (anu.action === 'remove' || anu.action === 'leave') memberCount -= 1

        for (const p of anu.participants) {
            const jid = p
            const phone = jid.split('@')[0]
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
                    mentionedJid: [jid, anu.author].filter(Boolean)
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
                    mentions: [jid],
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
                    mentions: [jid],
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
