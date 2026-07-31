export default {
  command: ['setgpdesc'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async ({client, m, args}) => {
    const newDesc = args.join(' ').trim()
    if (!newDesc)
      return m.reply('『✐』 Ingresa la nueva descripción que deseas ponerle al grupo.')

    try {
      await client.groupUpdateDescription(m.chat, newDesc)
      m.reply('✐ La descripción del grupo se modificó correctamente.')
    } catch {
      m.reply(msgglobal)
    }
  },
};
