export default {
  command: ['deldescription', 'deldesc'],
  category: 'rpg',
  run: async ({client, m}) => {
    const user = global.db.data.users[m.sender]
    if (!user.description) return m.reply(`『✐』 Aún no tienes una descripción establecida.`)

    user.description = ''
    return m.reply(`✎ Tu descripción ha sido eliminada.`)
  },
};
