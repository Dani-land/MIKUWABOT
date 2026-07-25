import fetch from "node-fetch"

export default {
  command: ["xvideos"],
  category: "nsfw",

  run: async ({ client, m, args }) => {
    if (!db?.data?.chats?.[m.chat]?.nsfw) {
      return m.reply('✐ Los comandos de *NSFW* están desactivados en este Grupo.')
    }

    try {
      const query = args.join(" ")
      if (!query) return m.reply("《✧》Ingresa el nombre de un video o una URL de XVideos.")

      const simbolos = ['☕︎', '𐙚', '♡', '୭', '⌗»', 'ꕥ', '✰', '✐']
      const s = [...simbolos].sort(() => Math.random() - 0.5)

      // API con scraper directo actualizado
      const searchUrl = `https://bk9.fun/download/xvideos?q=${encodeURIComponent(query)}`
      
      const res = await fetch(searchUrl)
      if (!res.ok) return m.reply(`${s[0]} El servidor de XVideos no responde en este momento.`)

      const json = await res.json()
      
      if (!json.status || !json.result || json.result.length === 0) {
        return m.reply(`${s[0]} No se encontraron videos para: "${query}".`)
      }

      // Estructura real devuelta por el servidor bk9
      const videoInfo = json.result[0]
      const videoDownloadLink = videoInfo.url 

      if (!videoDownloadLink) {
        return m.reply(`${s[0]} No se pudo extraer el enlace de descarga de este video.`);
      }

      const caption = `➮ *XVideos :: ${videoInfo.title || "Video"}*

→ *Duración ::* ${videoInfo.duration || "N/A"}
→ *Calidad ::* Alta (MP4)

> *✎ Enviando contenido por archivo, por favor espera...*`

      // Envío de la miniatura de pre-carga
      if (videoInfo.thumb) {
        await client.sendMessage(m.chat, {
          image: { url: videoInfo.thumb },
          caption
        }, { quoted: m })
      }

      // Envío del video en stream directo (No consume tu RAM)
      await client.sendMessage(m.chat, {
        document: { url: videoDownloadLink },
        mimetype: 'video/mp4',
        fileName: `${videoInfo.title || 'video'}.mp4`
      }, { quoted: m })

    } catch (err) {
      console.error(err)
      return m.reply(`❌ Ocurrió un error al procesar la descarga de XVideos.`)
    }
  },
}
