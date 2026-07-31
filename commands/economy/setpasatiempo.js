export default {
  command: ['setpasatiempo', 'sethobby'],
  category: 'rpg',
  run: async ({client, m, args}) => {
    const user = global.db.data.users[m.sender]
    const prefa = global.prefa || '!'
    const input = args.join(' ').trim()

    const pasatiemposDisponibles = [
      '📚 Leer', '✍️ Escribir', '🎤 Cantar', '💃 Bailar', '🎮 Jugar', 
      '🎨 Dibujar', '🍳 Cocinar', '✈️ Viajar', '🏊 Nadar', '📸 Fotografía',
      '🎧 Escuchar música', '🏀 Deportes', '🎬 Ver películas', '🌿 Jardinería',
      '🧵 Manualidades', '🎲 Juegos de mesa', '🏋️‍♂️ Gimnasio', '🚴 Ciclismo',
      '🎯 Tiro con arco', '🍵 Ceremonia del té', '🧘‍♂️ Meditación', '🎪 Malabares',
      '🛠️ Bricolaje', '🎹 Tocar instrumentos', '🐶 Cuidar mascotas', '🌌 Astronomía',
      '♟️ Ajedrez', '🍷 Catación de vinos', '🛍️ Compras', '🏕️ Acampar',
      '🎣 Pescar', '📱 Tecnología', '🎭 Teatro', '🍽️ Gastronomía', '🏺 Coleccionar',
      '✂️ Costura', '🧁 Repostería', '📝 Blogging', '🚗 Automóviles', '🧩 Rompecabezas',
      '🎳 Bolos', '🏄 Surf', '⛷️ Esquí', '🎿 Snowboard', '🤿 Buceo', '🏹 Tiro al blanco',
      '🧭 Orientación', '🏇 Equitación', '🎨 Pintura', '📊 Invertir', '🌡️ Meteorología',
      '🔍 Investigar', '💄 Maquillaje', '💇‍♂️ Peluquería', '🛌 Dormir', '🍺 Cervecería',
      '🪓 Carpintería', '🧪 Experimentos', '📻 Radioafición', '🗺️ Geografía', '💎 Joyería', '💦 Pajero', '🌳 Bugarron', '🍞:･:･ Migajero',
      'Otro 🌟'
    ]

    if (!input) {
      let lista = '🎯 *Selecciona un pasatiempo:*\n\n'
      pasatiemposDisponibles.forEach((pasatiempo, index) => {
        lista += `${index + 1}) ${pasatiempo}\n`
      })
      lista += `\n*Ejemplos:*\n${prefa}setpasatiempo 1\n${prefa}setpasatiempo Leer\n${prefa}setpasatiempo "Otro 🌟"`

      return m.reply(lista)
    }

    let pasatiempoSeleccionado = ''

    if (/^\d+$/.test(input)) {
      const index = parseInt(input) - 1
      if (index >= 0 && index < pasatiemposDisponibles.length) {
        pasatiempoSeleccionado = pasatiemposDisponibles[index]
      } else {
        return m.reply(`✦ Número inválido.\n> Elige un número entre 1 y ${pasatiemposDisponibles.length}`)
      }
    } 

    else {
      const inputLimpio = input.replace(/[^\w\s]/g, '').toLowerCase().trim()
      const encontrado = pasatiemposDisponibles.find(
        p => p.replace(/[^\w\s]/g, '').toLowerCase().includes(inputLimpio)
      )

      if (encontrado) {
        pasatiempoSeleccionado = encontrado
      } else {
        return m.reply('✦ Pasatiempo no encontrado.\n> Usa el comando sin texto para ver la lista completa.')
      }
    }

    if (user.pasatiempo === pasatiempoSeleccionado) {
      return m.reply(`✦ Ya tienes seleccionado este pasatiempo:\n> *${user.pasatiempo}*`)
    }

    user.pasatiempo = pasatiempoSeleccionado

    return m.reply(`✿ Tu pasatiempo fue actualizado correctamente.\n> 🎯 ${user.pasatiempo}`)
  },
};