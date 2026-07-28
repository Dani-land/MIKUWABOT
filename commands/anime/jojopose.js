import fetch from 'node-fetch'

const GIPHY_API_KEY = '4CCGapxUxxzSFfexbfoKyd9q3fmrpVYE'
const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search'

const symbols = [
  '(⁠◠⁠‿⁠◕⁠)', '˃͈◡˂͈', '(*≧ω≦)', '(✧ω✧)', 'ʕ•́ᴥ•̀ʔっ', '(¬‿¬)',
]

function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

async function getRandomJojoPose() {
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    q: 'jojo pose',
    limit: '50',
    rating: 'pg-13',
    lang: 'es',
  })

  const res = await fetch(`${GIPHY_SEARCH_URL}?${params.toString()}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Giphy HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json()
  const results = json?.data

  if (!Array.isArray(results) || !results.length) {
    throw new Error('Giphy no devolvió resultados de JoJo pose.')
  }

  const pick = results[Math.floor(Math.random() * results.length)]

  const gifUrl =
    pick?.images?.original?.mp4 ||
    pick?.images?.downsized_medium?.url ||
    pick?.images?.original?.url

  if (!gifUrl) {
    throw new Error('No se encontró un link de GIF válido en la respuesta de Giphy.')
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
