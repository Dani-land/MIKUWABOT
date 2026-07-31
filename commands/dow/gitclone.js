import fetch from 'node-fetch'

let regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i
export default {
  command: ['gitclone'],
  category: 'downloader',
  run: async ({client, m, usedPrefix, command, args}) => {
let botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
let botSettings = global.db.data.settings[botId]

let botname = botSettings.namebot
let icon = botSettings.icon
let banner = botSettings.banner
let currency = botSettings.currency
  if (!args[0]) {
    return client.reply(m.chat, `✐ Escribe el URL de algún repositorio de GitHub que quieras descargar.`, m, rcanal)
  }
  if (!regex.test(args[0])) {
    return client.reply(m.chat, `ꕥ Verifica que el *URL* sea realmente de GitHub`, m, rcanal).then()
  }
  let [_, user, repo] = args[0].match(regex) || []
  let sanitizedRepo = repo.replace(/.git$/, '')
  let repoUrl = `https://api.github.com/repos/${user}/${sanitizedRepo}`
  let zipUrl = `https://api.github.com/repos/${user}/${sanitizedRepo}/zipball`
      await client.sendMessage(m.chat, { react: { text: '💥', key: m.key } })
  try {
  client.reply(m.chat, "Espera un momento se está procesando...", m, {
  contextInfo: { externalAdReply :{ mediaUrl: null, mediaType: 1, showAdAttribution: true,
  title: botname,
  body: wm,
  previewType: 0, thumbnailUrl: icon,
  sourceUrl: channel }}})
    let [repoResponse, zipResponse] = await Promise.all([
      fetch(repoUrl),
      fetch(zipUrl),
    ])
    let repoData = await repoResponse.json()
    let filename = zipResponse.headers.get('content-disposition').match(/attachment; filename=(.*)/)[1]
    let type = zipResponse.headers.get('content-type')
    let img = botSettings.icon || botSettings.banner || 'https://files.catbox.moe/s2v4f4.jpeg'
    let txt = `*乂 G I T H U B - D O W N L O A D 乂*\n\n`
       txt += `✩  *Nombre* : ${sanitizedRepo}\n`
       txt += `✩  *Repositorio* : ${user}/${sanitizedRepo}\n`
       txt += `✩  *Creador* : ${repoData.owner.login}\n`
       txt += `✩  *Descripción* : ${repoData.description || 'Sin descripción disponible'}\n`
       txt += `✩  *Url* : ${args[0]}\n\n`
       txt += `*${textbot}*`

await client.sendFile(m.chat, img, 'thumbnail.jpg', txt, m, null, rcanal)
await client.sendFile(m.chat, await zipResponse.buffer(), filename, null, m)
  } catch {
m.reply('Error.')
  }
}}