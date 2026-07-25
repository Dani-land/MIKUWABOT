export default {
  command: ['delgenre'],
  category: 'rpg',
  run: async ({client, m}) => {
    const user = global.db.data.users[m.sender]
    if (!user.genre) return m.reply(`『✐』 Aún no tienes un género establecido.`)

    user.genre = ''
    return m.reply(`✎ Tu género ha sido eliminado.`)
  },
};
