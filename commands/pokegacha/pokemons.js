export default {
  command: ['mypokemons', 'pokemons', 'pokegab'],
  category: 'pokegacha',

  run: async ({ client, m }) => {
    try {
      const db = global.db.data
      const user = db.users[m.sender]

      if (!user.pokemons) user.pokemons = []

      if (user.pokemons.length < 1) {
        return m.reply('✐ Aún no has reclamado ningún Pokémon.')
      }

      let txt = `✦ Tus Pokémon reclamados\n\n`

      user.pokemons.forEach((p, i) => {
        txt += `✧ ${i + 1}. ${p.name} (${p.id})\n`
      })

      txt += `\n✿ Total › *${user.pokemons.length}*`

      m.reply(txt)

    } catch (e) {
      console.log(e)
      m.reply('❌ Error al mostrar tus Pokémon.')
    }
  }
}