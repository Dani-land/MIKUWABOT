export default {
  command: ['setusername'],
  category: 'socket',

  run: async ({client, m, args}) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const config = global.db.data.settings[idBot];

    const isOwner2 = [
      idBot,
      ...global.owner.map((number) => number + '@s.whatsapp.net')
    ].includes(m.sender);

    if (!isOwner2 && m.sender !== owner)
      return m.reply(mess.socket);

    const value = args.join(' ').trim();

    if (!value) {
      return m.reply(
`✦ Debes escribir un nombre de usuario válido.

✐ Ejemplo:
> ${prefa}setusername Hatsune Miku Bot`
      );
    }

    await client.updateProfileName(value);

    return m.reply(
`✦ El nombre de usuario del bot fue actualizado correctamente.

✎ Nuevo nombre:
> ${value}`
    );
  },
};