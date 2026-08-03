import { isSocketOwner } from '../../lib/utils.js'

export default {
  command: ['setchannel', 'setbotchannel'],
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
`✦ Debes ingresar un enlace o ID de canal.

✧ Ejemplo:
> ${prefa}setchannel https://whatsapp.com/channel/xxxxx`
      )
    }

    let info, ch

    if (/@newsletter$/i.test(value)) {
      ch = value.trim()
      info = await client.newsletterMetadata("jid", ch)

    } else {
      const channelUrl = value.match(
        /(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|joinchat\/)?([0-9A-Za-z]{22,24})/i
      )?.[1]

      if (!channelUrl) {
        return m.reply(
`✦ El enlace o ID del canal no es válido.

✧ Verifica que esté bien escrito.`
        )
      }

      info = await client.newsletterMetadata("invite", channelUrl)
      ch = info?.id
    }

    if (!info) {
      return m.reply(
`✦ No se pudo obtener la información del canal.

✧ Intenta nuevamente más tarde.`
      )
    }

    config.id = info.id
    config.nameid = info.thread_metadata.name.text || "Canal sin nombre"

    return m.reply(
`✐ Canal actualizado correctamente.

❍ Canal › *${config.nameid}*
❍ ID › ${config.id}`
    )
  },
};