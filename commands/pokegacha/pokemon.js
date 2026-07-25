import fetch from 'node-fetch'

export default {
  command: ['pokemon', 'poke'],
  category: 'pokegacha',

  run: async ({ client, m }) => {
    try {
      const db = global.db.data
      const user = db.users[m.sender]

      if (!user.pokemons) user.pokemons = []

      const randomId = Math.floor(Math.random() * 1025) + 1

      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`)
      const json = await res.json()

      const name =
        json.name.charAt(0).toUpperCase() +
        json.name.slice(1)

      const image =
        json.sprites.other['official-artwork'].front_default ||
        json.sprites.front_default

      const types = json.types
        .map(v => v.type.name)
        .join(', ')

      const height = json.height / 10
      const weight = json.weight / 10

      user.lastPokemon = {
        id: json.id,
        name,
        image,
        type: types
      }

      let txt = `✦ Pokémon salvaje encontrado\n\n`
      txt += `✧ Nombre › *${name}*\n`
      txt += `✧ ID › *${json.id}*\n`
      txt += `✧ Tipo › *${types}*\n`
      txt += `✧ Altura › *${height}m*\n`
      txt += `✧ Peso › *${weight}kg*\n\n`
      txt += `✐ Usa *.reclaim* para reclamarlo`

      await client.sendMessage(
        m.chat,
        {
          image: { url: image },
          caption: txt
        },
        { quoted: m }
      )

    } catch (e) {
      console.log(e)
      m.reply('❌ Error al generar el Pokémon.')
    }
  }
}