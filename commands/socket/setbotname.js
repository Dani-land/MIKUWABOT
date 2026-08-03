import { isSocketOwner } from '../../lib/utils.js'

export default {
  command: ['setbotname', 'setname'],
  category: 'socket',

  run: async ({client, m, args}) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]

    if (!isSocketOwner(client, m, config)) {
      return m.reply(mess.socket)
    }

    const value = args.join(' ').trim()

    if (!value) {
      return m.reply(
`✦ Debes escribir un nombre válido para el bot.

✧ Ejemplo:
> ${prefa}setbotname Miku / Hatsune Miku Bot`
      )
    }

    const formatted = value.replace(/\s*\/\s*/g, '/')

    let [short, long] = formatted.includes('/')
      ? formatted.split('/')
      : [value, value]

    if (!short || !long) {
      return m.reply(
`✦ Usa el formato correcto.

> Nombre corto / Nombre largo`
      )
    }

    if (/\s/.test(short)) {
      return m.reply(
`✦ El nombre corto no puede tener espacios.

✧ Ejemplo válido:
> Miku / Hatsune Miku Bot`
      )
    }

    config.namebot2 = short.trim()
    config.namebot = long.trim()

    return m.reply(
`✐ Nombre del bot actualizado correctamente.

❍ Nombre corto › *${short.trim()}*
❍ Nombre largo › *${long.trim()}*`
    )
  },
};