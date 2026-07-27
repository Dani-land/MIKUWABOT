import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'
import axios from 'axios'
import crypto from 'crypto'

const limit = 300

class SaveTube {
  constructor() {
    this.ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12'

    this.m =
      /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/

    this.is = axios.create({
      headers: {
        'content-type': 'application/json',
        origin: 'https://yt.savetube.me',
        'user-agent': 'Mozilla/5.0'
      }
    })
  }

  async decrypt(enc) {
    const sr = Buffer.from(enc, 'base64')
    const ky = Buffer.from(this.ky, 'hex')

    const iv = sr.slice(0, 16)
    const dt = sr.slice(16)

    const dc = crypto.createDecipheriv('aes-128-cbc', ky, iv)

    return JSON.parse(
      Buffer.concat([
        dc.update(dt),
        dc.final()
      ]).toString()
    )
  }

  async getCdn() {
    const r =
      await this.is.get(
        'https://media.savetube.vip/api/random-cdn'
      )

    return r.data.cdn
  }

  async download(url, isAudio) {
    const id = url.match(this.m)?.[3]

    if (!id) throw new Error('ID inválido')

    const cdn = await this.getCdn()

    const info = await this.is.post(
      `https://${cdn}/v2/info`,
      {
        url: `https://www.youtube.com/watch?v=${id}`
      }
    )

    const dec = await this.decrypt(info.data.data)

    const dl = await this.is.post(
      `https://${cdn}/download`,
      {
        id,
        downloadType: isAudio ? 'audio' : 'video',
        quality: isAudio ? '128' : '720',
        key: dec.key
      }
    )

    return {
      dl: dl.data.data.downloadUrl,
      title: dec.title
    }
  }
}

const VEVO_API_BASE = 'https://api.vevioz.com'

const isYTUrl = (url) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/).+$/i.test(url)

const fetchParallelFirstValid = async (url, apis, timeout = 45000) => {
  return new Promise((resolve, reject) => {
    let finished = false
    let errors = 0

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true
        reject(new Error('Las APIs tardaron demasiado.'))
      }
    }, timeout)

    for (const api of apis) {
      ;(async () => {
        try {
          let result

          if (api.custom) {
            result = await api.run(url)
          } else {
            const controller = new AbortController()
            const timeoutFetch = setTimeout(() => controller.abort(), 40000)

            const res = await fetch(api.url(url), {
              signal: controller.signal
            })

            clearTimeout(timeoutFetch)

            const json = await res.json()

            if (!api.validate(json)) {
              throw new Error('API inválida')
            }

            result = await api.parse(json)
          }

          if (result?.dl && !finished) {
            finished = true
            clearTimeout(timer)
            resolve(result)
          }
        } catch (e) {
          errors++

          if (errors >= apis.length && !finished) {
            finished = true
            clearTimeout(timer)
            reject(new Error('Todas las APIs fallaron.'))
          }
        }
      })()
    }
  })
}

export default {
  command: [
    'playdoc',
    'playdocumento',
    'ytmp3doc',
    'ytmp4doc',
    'playdoc2'
  ],

  category: 'downloader',

  run: async ({ client, m, args, command, text }) => {
    try {
      if (!text.trim()) {
        return client.reply(
          m.chat,
          '✐ Ingresa un nombre o URL de YouTube.',
          m
        )
      }

      const esURL = isYTUrl(text)

      let url, title, videoInfo

      if (!esURL) {
        const search = await yts(text)

        if (!search.all.length) {
          return m.reply('ꕥ No encontré resultados.')
        }

        videoInfo = search.all[0]

        ;({ title, url } = videoInfo)

        const info = `
✿ Descargando documento...

⌗» Título › ${title}
⌗» Duración › ${videoInfo.duration}
⌗» Vistas › ${videoInfo.views?.toLocaleString() || 0}
⌗» Canal › ${videoInfo.author?.name || 'Desconocido'}
⌗» Publicado › ${videoInfo.ago || 'Desconocido'}
♡ Api: Vevioz / SaveTube
`.trim()

        let thumb

        try {
          thumb = (await client.getFile(videoInfo.thumbnail))?.data
        } catch {}

        await client.sendMessage(
          m.chat,
          thumb ? { image: thumb, caption: info } : { text: info },
          { quoted: m }
        )
      } else {
        url = text

        try {
          videoInfo = await yts({
            videoId:
              new URL(url).searchParams.get('v') ||
              url.split('/').pop()
          })

          title = videoInfo?.title || 'Video'
        } catch {
          title = 'Video'
        }
      }

      const isAudio = [
        'playdoc',
        'playdocumento',
        'ytmp3doc'
      ].includes(command)

      const vevioApi = {
        custom: true,
        run: async (videoUrl) => {
          const type = isAudio ? 'mp3' : 'videos'
          const apiUrl = `${VEVO_API_BASE}/api/single/${type}?url=${encodeURIComponent(videoUrl)}`
          
          const res = await fetch(apiUrl)
          if (!res.ok) throw new Error('Vevioz falló')
          
          const json = await res.json()
          
          return {
            dl: json?.result?.download_url || json?.download_url || json?.url,
            title: json?.result?.title || json?.title || title
          }
        }
      }

      const senkoApi = {
        url: (u) =>
          isAudio
            ? `https://api.senko.my.id/api/audio?url=${encodeURIComponent(u)}`
            : `https://api.senko.my.id/api/video?url=${encodeURIComponent(u)}`,

        validate: (r) =>
          r?.download || r?.url || r?.result?.url || r?.data?.url,

        parse: (r) => ({
          dl:
            r?.download ||
            r?.url ||
            r?.result?.url ||
            r?.data?.url,

          title:
            r?.title ||
            r?.result?.title ||
            r?.data?.title ||
            'Senko Media'
        })
      }

      const saveTubeFallback = {
        custom: true,
        run: async (u) => {
          const sv = new SaveTube()
          return await sv.download(u, isAudio)
        }
      }

      const apis = [vevioApi, senkoApi, saveTubeFallback]

      const { dl, title: apiTitle } =
        await fetchParallelFirstValid(url, apis)

      let thumbBuffer = null

      if (videoInfo?.thumbnail) {
        try {
          const response = await fetch(videoInfo.thumbnail)
          const arrayBuffer = await response.arrayBuffer()

          thumbBuffer = await sharp(Buffer.from(arrayBuffer))
            .resize(320, 180)
            .jpeg({ quality: 80 })
            .toBuffer()
        } catch {}
      }

      const finalTitle = apiTitle || title

      if (isAudio) {
        await client.sendMessage(
          m.chat,
          {
            document: { url: dl },
            mimetype: 'audio/mpeg',
            fileName: `${finalTitle}.mp3`,
            jpegThumbnail: thumbBuffer || undefined
          },
          { quoted: m }
        )
      } else {
        await client.sendMessage(
          m.chat,
          {
            document: { url: dl },
            mimetype: 'video/mp4',
            fileName: `${finalTitle}.mp4`,
            jpegThumbnail: thumbBuffer || undefined
          },
          { quoted: m }
        )
      }
    } catch (e) {
      console.log(e)

      m.reply(
`✘ Error detectado.

⌗» ${e.message}`
      )
    }
  }
      }
