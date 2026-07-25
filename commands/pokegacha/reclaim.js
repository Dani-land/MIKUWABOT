export default {
  command: ['reclaim'],
  category: 'pokegacha',

  run: async ({ client, m }) => {
    try {
      const db = global.db.data
      const user = db.users[m.sender]

      if (!user.pokemons) user.pokemons = []

      if (!user.lastPokemon) {
        return m.reply('✐ Primero usa *.pokemon* para generar un Pokémon.')
      }

      const already = user.pokemons.find(
        p => p.id === user.lastPokemon.id
      )

      if (already) {
        return m.reply(`✧ Ya habías reclamado a *${already.name}*.`)
      }

      user.pokemons.push(user.lastPokemon)

      const poke = user.lastPokemon

      let txt = `✦ Pokémon reclamado correctamente\n\n`
      txt += `✧ Nombre › *${poke.name}*\n`
      txt += `✧ ID › *${poke.id}*\n`
      txt += `✧ Tipo › *${poke.type}*\n\n`
      txt += `✿ Total reclamados › *${user.pokemons.length}*`

      await client.sendMessage(
        m.chat,
        {
          image: { url: poke.image },
          caption: txt
        },
        { quoted: m }
      )

      user.lastPokemon = null

    } catch (e) {
      console.log(e)
      m.reply('❌ Error al reclamar el Pokémon.')
    }
  }
}