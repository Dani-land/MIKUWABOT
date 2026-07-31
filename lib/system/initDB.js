let isNumber = (x) => typeof x === 'number' && !isNaN(x)

function initDB(m, client) {
  const jid = client.user.id.split(':')[0] + '@s.whatsapp.net'

  const settings = global.db.data.settings[jid] ||= {}
  settings.self ??= false
  settings.prefijo ??= ['/', '#', '.']
  settings.id ??= '120363420575743790@newsletter'
  settings.nameid ??= '✦ 𝑴𝒊𝒌𝒖 𝑨𝑰 𝑪𝒉𝒂𝒏𝒏𝒆𝒍 ﻿✦'
  settings.type ??= 'Owner'
  settings.link ??= 'https://whatsapp.com/channel/0029VbBUzJ6DzgT8o9NiMq2b'
  settings.banner ??= 'https://files.catbox.moe/54zthn.jpg'
  settings.icon ??= 'https://files.catbox.moe/s2v4f4.jpeg'
  settings.currency ??= 'Coins'
  settings.namebot ??= '𝕄𝕚𝕜𝕦𝕎𝕒𝕓𝕠𝕥'
  settings.namebot2 ??= 'ʜᴀᴛsᴜɴᴇ ᴍɪᴋᴜ ʙᴏᴛ'
  settings.owner ??= '⍴᥆ᥕᥱrᥱძ ᑲᥡ ᗪᥲᥒіᥱᥣᖇ᙭乙♡'

  const user = global.db.data.users[m.sender] ||= {}
  user.name ??= ''
  user.exp = isNumber(user.exp) ? user.exp : 0
  user.level = isNumber(user.level) ? user.level : 0
  user.usedcommands = isNumber(user.usedcommands) ? user.usedcommands : 0
  user.pasatiempo ??= ''
  user.description ??= ''
  user.marry ??= ''
  user.genre ??= ''
  user.birth ??= ''
  user.metadatos ??= null
  user.metadatos2 ??= null

  const chat = global.db.data.chats[m.chat] ||= {}
  chat.users ||= {}
  chat.bannedGrupo ??= false
  chat.welcome ??= true
  chat.nsfw ??= false
  chat.antistatus ??= false
  chat.alerts ??= true
  chat.gacha ??= true
  chat.rpg ??= true
  chat.adminonly ??= false
  chat.primaryBot ??= null
  chat.antilinks ??= true
  chat.personajesReservados ||= []

  chat.users[m.sender] ||= {}
  chat.users[m.sender].coins = isNumber(chat.users[m.sender].coins) ? chat.users[m.sender].coins : 0
  chat.users[m.sender].bank = isNumber(chat.users[m.sender].bank) ? chat.users[m.sender].bank : 0
  chat.users[m.sender].characters = Array.isArray(chat.users[m.sender].characters) ? chat.users[m.sender].characters : []
}

export default initDB;