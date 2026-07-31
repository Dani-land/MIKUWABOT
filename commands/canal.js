const OWNER_NUMBER = '5216242255295'

function isOwner(jid = '') {
  const number = jid.split('@')[0].split(':')[0]
  return number === OWNER_NUMBER
}

export default {
  command: ['canal'],
  category: 'owner',

  run: async ({ client, m, args }) => {
    if (!isOwner(m.sender)) {
      return m.reply('✘ Este comando solo puede usarlo el creador del bot.')
    }

    const sub = (args[0] || '').toLowerCase()

    if (!['on', 'off'].includes(sub)) {
      return m.reply('✐ Uso: *#canal on* o *#canal off*')
    }

    const botId = ((client.user?.id || client.user?.jid || '').split(':')[0] || '') + '@s.whatsapp.net'
    global.db.data.settings[botId] = global.db.data.settings[botId] || {}
    global.db.data.settings[botId].canalLogs = sub === 'on'

    return m.reply(
      sub === 'on'
        ? '✔ Activado — a partir de ahora se enviará al canal el registro de cada comando usado.'
        : '✔ Desactivado — ya no se enviará nada al canal.'
    )
  },
}
