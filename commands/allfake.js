export async function before(m, { client }) {
const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
const bot = global.db?.data?.settings?.[botId] || {}
const botname = bot.namebot || 'MikuWabot'
const botname2 = bot.namebot2 || 'Miku AI'
const icon = bot.icon || ''

var canal = 'https://whatsapp.com/channel/0029VbBUzJ6DzgT8o9NiMq2b'
var canal2 = 'https://whatsapp.com/channel/0029VbBUzJ6DzgT8o9NiMq2b'
var gpo = "https://chat.whatsapp.com/GOcZvVzeDB36CaFMHBH0dE"

global.redes = [canal, canal2, gpo][Math.floor(Math.random() * 3)]

    m.rcanal = {
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363420575743790@newsletter',
                newsletterName: botname,
                serverMessageId: -1,
            }
        }
    }
/*m.rcanal = {contextInfo: {forwardingScore: 2026, isForwarded: true, externalAdReply: {title: botname, body: dev, sourceUrl: redes, thumbnailUrl: icon}}}*/
}