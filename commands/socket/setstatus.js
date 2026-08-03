import { isSocketOwner } from '../../lib/utils.js'

export default {
  command: ['setstatus'],
  category: 'socket',

  run: async ({client, m, args}) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const config = global.db.data.settings[idBot];

    if (!isSocketOwner(client, m, config))
      return m.reply(mess.socket);

    const value = args.join(' ').trim();

    if (!value) {
      return m.reply(
`✦ Debes escribir un estado válido.

✐ Ejemplo:
> ${prefa}setstatus Hola, soy ${config.namebot2}`
      );
    }

    await client.updateProfileStatus(value);

    return m.reply(
`✦ El estado de *${config.namebot2}* fue actualizado correctamente.

✎ Nuevo estado:
> ${value}`
    );
  },
};