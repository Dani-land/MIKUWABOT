import fetch from "node-fetch"

export default {
  command: ["xnxx"],
  category: "nsfw",

  run: async ({ client, m, args }) => {
    if (!db?.data?.chats?.[m.chat]?.nsfw) {
      return m.reply('✐ Los comandos de *NSFW* están desactivados en este Grupo.')
    }

    try {
      const query = args.join(" ")
      if (!query) return m.reply("《✧》Ingresa el nombre de un video o una URL de XNXX.")

      const simbolos = ['☕︎', '𐙚', '♡', '୭', '⌗»', 'ꕥ', '✰', '✐']
      const s = [...simbolos].sort(() => Math.random() - 0.5)

      // API con scraper directo actualizado para XNXX
      const searchUrl = `https://bk9.fun/download/xnxx?q=${encodeURIComponent(query)}`
      
      const res = await fetch(searchUrl)
      if (!res.ok) return m.reply(`${s[0]} El servidor de XNXX no responde en este momento.`)

      const json = await res.json()
      
      if (!json.status || !json.result || json.result.length === 0) {
        return m.reply(`${s[0]} No se encontraron videos para: "${query}".`)
      }

      const videoInfo = json.result[0]
      const videoDownloadLink = videoInfo.url

      if (!videoDownloadLink) {
        return m.reply(`${s[0]} No se pudo extraer el enlace de descarga de este video.`);
      }

      const caption = `➮ *XNXX :: ${videoInfo.title || "Video"}*

→ *Duración ::* ${videoInfo.duration || "N/A"}
→ *Calidad ::* Alta (MP4)

> *✎ Enviando contenido por archivo, por favor espera...*`

      if (videoInfo.thumb) {
        await client.sendMessage(m.chat, {
          image: { url: videoInfo.thumb },
          caption
        }, { quoted: m })
      }

      await client.sendMessage(m.chat, {
        document: { url: videoDownloadLink },
        mimetype: 'video/mp4',
        fileName: `${videoInfo.title || 'video'}.mp4`
      }, { quoted: m })

    } catch (err) {
      console.error(err)
      return m.reply(`❌ Ocurrió un error al procesar la descarga de XNXX.`)
    }
  },
}
