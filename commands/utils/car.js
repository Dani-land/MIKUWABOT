import fetch from 'node-fetch'

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

export default {
  command: ['car', 'cars', 'coche'],
  category: 'utils',

  run: async ({ client, m }) => {
    try {
      const brands = [
        'bmw',
        'audi',
        'mercedes',
        'ferrari',
        'lamborghini',
        'bugatti',
        'porsche',
        'mclaren'
      ]

      const brand = pickRandom(brands)

      const res = await fetch(
        `https://api.api-ninjas.com/v1/cars?limit=10&make=${brand}`,
        {
          headers: {
            'X-Api-Key': 't2qIFyHCqY7b1lPY3E60NClVaMJ0DCSbKgECe43X'
          }
        }
      )

      const json = await res.json()

      if (!json.length) {
        return m.reply('✘ No se encontraron autos.')
      }

      const car = pickRandom(json)

      const image = `https://source.unsplash.com/1280x720/?${encodeURIComponent(car.make + ' ' + car.model)}`

      let txt = `✦ Auto de lujo encontrado\n\n`
      txt += `✧ Marca › *${car.make}*\n`
      txt += `✧ Modelo › *${car.model}*\n`
      txt += `✧ Año › *${car.year || 'Desconocido'}*\n`
      txt += `✧ Cilindros › *${car.cylinders || 'N/A'}*\n`
      txt += `✧ Transmisión › *${car.transmission || 'N/A'}*\n`
      txt += `✧ Combustible › *${car.fuel_type || 'N/A'}*\n\n`
      txt += `✐ Auto generado aleatoriamente`

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

      m.reply('❌ Error al obtener el auto.')
    }
  }
}