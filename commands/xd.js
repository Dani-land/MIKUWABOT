const TRIGGERS = [
  {
    // xd, xdd, xddd, xdddd... (mayúsculas o minúsculas)
    regex: /^xd+$/i,
    audios: [
      'https://files.catbox.moe/h9at8f.mp3',
      'https://files.catbox.moe/npmv7w.mp3',

'https://files.catbox.moe/l0cwuh.mp3',
    ],
  },
]

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

export async function all(m, { client }) {
  try {
    if (m.key?.fromMe) return
    if (!m.chat) return

    const text = (m.text || '').trim()
    if (!text) return

    const trigger = TRIGGERS.find((t) => t.regex.test(text))
    if (!trigger) return

    const audioUrl = pickRandom(trigger.audios)

    await client.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        ptt: false,
      },
      { quoted: m }
    )
  } catch (err) {
    console.log('[audio-triggers]', err.message)
  }
}
