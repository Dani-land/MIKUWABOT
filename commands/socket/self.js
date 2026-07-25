export default {
  command: ['self'],
  category: 'socket',
  run: async ({client, m, args}) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]

    const isOwner2 = [
      idBot,
      ...globalThis.owner.map((number) => number + '@s.whatsapp.net'),
    ].includes(m.sender)

    if (!isOwner2 && m.sender !== owner) {
      return m.reply(mess.socket)
    }

    const chat = global.db.data.settings[idBot]
    const estado = chat.self ?? false

    if (args[0] === 'enable' || args[0] === 'on') {
      if (estado) {
        return m.reply(
`⌗ 𝗦𝗘𝗟𝗙 — 𝗠𝗢𝗗𝗘

✦ El modo *Self* ya está activado.
✧ Solo los owners pueden usar el bot.`)
      }

      chat.self = true

      return m.reply(
`⌗ 𝗦𝗘𝗟𝗙 — 𝗠𝗢𝗗𝗘

✦ Modo *Self* activado correctamente.
✧ Ahora el bot solo responderá a los owners.`)
    }

    if (args[0] === 'disable' || args[0] === 'off') {
      if (!estado) {
        return m.reply(
`⌗ 𝗦𝗘𝗟𝗙 — 𝗠𝗢𝗗𝗘

✦ El modo *Self* ya estaba desactivado.
✧ El bot sigue en modo público.`)
      }

      chat.self = false

      return m.reply(
`⌗ 𝗦𝗘𝗟𝗙 — 𝗠𝗢𝗗𝗘

✦ Modo *Self* desactivado correctamente.
✧ El bot vuelve a estar en modo público.`)
    }

    return m.reply(
`╭━〔 🎀 𝗦𝗘𝗟𝗙 • 𝗠𝗢𝗗𝗘 〕━⬣
┃ ✦ Estado › ${estado ? '🟢 Activado' : '🔴 Desactivado'}
┃
┃ ⌗ Opciones:
┃ ❍ *self enable*
┃ ❍ *self disable*
╰━━━━━━━━━━━━⬣`
    )
  },
};