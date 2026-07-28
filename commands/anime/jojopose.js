import fetch from 'node-fetch'

const TENOR_API_KEY = 'INGRESA_TU_KEY_SI_ERES_DE_TERMUX'
const TENOR_SEARCH_URL = 'https://tenor.googleapis.com/v2/search'

const symbols = [
  '(⁠◠⁠‿⁠◕⁠)', '˃͈◡˂͈', '(*≧ω≦)', '(✧ω✧)', 'ʕ•́ᴥ•̀ʔっ', '(¬‿¬)',
]

function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

async function getRandomJojoPose() {
  const params = new URLSearchParams({
    q: 'jojo pose',
    key: TENOR_API_KEY,
    client_key: 'jojopose_bot',
    limit: '50',
    media_filter: 'gif,mp4,tinygif',
    contentfilter: 'medium',
  })

  const res = await fetch(`${TENOR_SEARCH_URL}?${params.toString()}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Tenor HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json()
  const results = json?.results

  if (!Array.isArray(results) || !results.length) {
    throw new Error('Tenor no devolvió resultados de JoJo pose.')
  }

  const pick = results[Math.floor(Math.random() * results.length)]

  const gifUrl =
    pick?.media_formats?.mp4?.url ||
    pick?.media_formats?.gif?.url ||
    pick?.media_formats?.tinygif?.url

  if (!gifUrl) {
    throw new Error('No se encontró un link de GIF válido en la respuesta de Tenor.')
  }

  return gifUrl
}

export default {
  command: ['jojopose', 'jojo'],
  category: 'anime',

  run: async ({ client, m }) => {
    try {
      const gifUrl = await getRandomJojoPose()

      const fromName = global.db.data.users[m.sender]?.name || 'Alguien'
      const caption = `✦ *${fromName}* hizo una pose de JoJo ${getRandomSymbol()}.`

      await client.sendMessage(
        m.chat,
        {
          video: { url: gifUrl },
          gifPlayback: true,
          caption,
        },
        { quoted: m }
      )
    } catch (e) {
      console.log('[jojopose]', e.message)
      await m.reply('✘ No se pudo obtener una pose de JoJo, intenta de nuevo.')
    }
  },
}
