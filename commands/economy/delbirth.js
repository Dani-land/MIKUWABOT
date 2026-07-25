export default {
  command: ['delbirth'],
  category: 'rpg',
  run: async ({client, m}) => {
    const user = global.db.data.users[m.sender]
    if (!user.birth) return m.reply(`『✐』 No has establecido tu fecha de cumpleaños.`)

    user.birth = ''
    return m.reply(`✎ Tu fecha de nacimiento ha sido eliminada.`)
  },
};
