export default {
  command: ['setdescription', 'setdesc'],
  category: 'rpg',
  run: async ({client, m, args}) => {
    const user = global.db.data.users[m.sender]
    const input = args.join(' ')

    if (user.description)
      return m.reply(
        `✦ Ya tienes una descripción guardada.\n> Usa › *${prefa}deldescription* para eliminarla.`,
      )

    if (!input)
      return m.reply(
        '✦ Debes escribir una descripción válida.',
      )

    user.description = input
    return m.reply(`✿ Tu descripción fue actualizada correctamente.\n> 📝 ${user.description}`)
  },
};