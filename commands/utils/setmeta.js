export default {
  command: ['setmeta'],
  category: 'utils',

  run: async ({client, m, args}) => {
    const db = global.db.data
    const userId = m.sender
    const user = db.users[userId]

    if (!args || args.length === 0) {
      return m.reply(
        `✐ Escribe los metadatos que quieres usar en tus stickers.\n\n> Ejemplo:\n*${prefa}setmeta Hatsune Miku Bot | Miku Wabot*`
      )
    }

    try {
      const fullArgs = args.join(' ')

      const [metadatos01, metadatos02] = fullArgs
        .split('|')
        .map(meta => meta.trim())

      user.metadatos = metadatos01 || ''
      user.metadatos2 = metadatos02 || ''

      await client.sendMessage(
        m.chat,
        {
          text:
`✓ Metadatos actualizados correctamente.

✦ Autor › ${user.metadatos || 'Sin definir'}
✦ Paquete › ${user.metadatos2 || 'Sin definir'}`
        },
        { quoted: m }
      )

    } catch (e) {
      await m.reply(msgglobal)
    }
  },
};