const linkRegex = /(https?:\/\/)?(chat\.whatsapp\.com\/[0-9A-Za-z]{20,24}|whatsapp\.com\/channel\/[0-9A-Za-z]{20,24})/i

const allowedLinks = [
  'https://whatsapp.com/channel/0029VbBUzJ6DzgT8o9NiMq2b',
  'https://whatsapp.com/channel/0029VbBUzJ6DzgT8o9NiMq2b',
  'https://chat.whatsapp.com/GOcZvVzeDB36CaFMHBH0dE'
]

const joinCommands = [
  '/invite', '#invite', '-invite',
  '!invite', '.invite', '+invite'
]

export async function before(m, { client }) {
  if (!m.isGroup || !m.text) return

  const groupMetadata = await client.groupMetadata(m.chat).catch(() => null)
  if (!groupMetadata) return

  const participants = groupMetadata.participants || []
  const groupAdmins = participants
    .filter(p => p.admin)
    .map(p => p.id)
    .filter(Boolean)
  const isAdmin = groupAdmins.includes(m.sender)
  const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const isBotAdmin = groupAdmins.some(a => a === botId || a.split('@')[0] === botId.split('@')[0])

  const chat = globalThis?.db?.data?.chats?.[m.chat]
  const primaryBotId = chat?.primaryBot
  const isPrimary = !primaryBotId || primaryBotId === botId

  const isGroupLink = linkRegex.test(m.text)
  const hasAllowedLink = allowedLinks.some(link => m.text.includes(link))
  const command = m.text.trim().split(/\s+/)[0].toLowerCase()

  if (hasAllowedLink || !isGroupLink || !chat?.antilinks || isAdmin || !isBotAdmin || !isPrimary) return

  // Borrar el mensaje una sola vez
  await client.sendMessage(m.chat, {
    delete: {
      remoteJid: m.chat,
      fromMe: false,
      id: m.key.id,
      participant: m.key.participant
    }
  })

  // Si no es un comando de invitación permitido, avisar y expulsar
  if (!joinCommands.includes(command)) {
    const userName = global.db.data.users[m.sender]?.name || 'Usuario'
    await client.reply(m.chat, `ꕥ *${userName}* eliminado por \`Anti-Link\``, null)
    await client.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
  }
};