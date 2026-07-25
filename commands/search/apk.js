import axios from 'axios'

// Headers que imitan la app oficial de APKPure para mayor compatibilidad
const PURE_HEADERS = {
  'User-Agent': 'APKPure/3.17.26 (Linux; U; Android 11; en-US) AppleWebKit/537.36',
  'Accept': 'application/json',
}

/**
 * Intenta obtener los detalles + URL de descarga del APK desde múltiples fuentes.
 * Fuente 1: APKPure API v2 (detail + download_version) — más confiable
 * Fuente 2: tio-api.vercel.app                          — fallback original
 * Fuente 3: URL directa de APKPure                     — último recurso
 */
async function getApkData(packageName, appFallback) {
  // ── Fuente 1: APKPure API oficial ──────────────────────────────────────────
  try {
    const detailRes = await axios.get(
      `https://api-v2.apkpure.net/v3/app_detail?pn=${encodeURIComponent(packageName)}&hl=es`,
      { timeout: 12000, headers: PURE_HEADERS }
    )
    const det = detailRes.data?.data
    const versionCode = det?.currentVersionCode

    if (versionCode) {
      const dlRes = await axios.get(
        `https://api-v2.apkpure.net/v3/download_version?pn=${encodeURIComponent(packageName)}&versionCode=${versionCode}&hl=es`,
        { timeout: 12000, headers: PURE_HEADERS }
      )
      const asset = dlRes.data?.data?.assets?.[0]
      if (asset?.url) {
        return {
          name:     det.title      || appFallback.name,
          version:  det.currentVersionName || 'Latest',
          size:     asset.size ? `${(asset.size / 1024 / 1024).toFixed(1)} MB` : '—',
          icon:     det.icon?.url  || appFallback.icon,
          download: asset.url,
        }
      }
    }
  } catch {}

  // ── Fuente 2: tio-api (original) ───────────────────────────────────────────
  try {
    const res = await axios.get(
      `https://tio-api.vercel.app/apk?query=${encodeURIComponent(packageName)}`,
      { timeout: 10000 }
    )
    if (res.data?.download) return res.data
  } catch {}

  // ── Fuente 3: URL directa de APKPure (redirect al APK más reciente) ────────
  return {
    name:     appFallback.name,
    version:  'Latest',
    size:     '—',
    icon:     appFallback.icon,
    download: `https://d.apkpure.net/b/apk/${packageName}?version=latest`,
  }
}

export default {
  command: ['aptoide', 'apk', 'apkdl'],
  category: 'search',

  run: async ({ client, m, args }) => {
    if (!args.length) {
      return m.reply('✧ Ingresa el nombre de una aplicación o juego.')
    }

    const query = args.join(' ').trim()

    try {
      // Búsqueda de aplicación en APKPure
      const searchRes = await axios.get(
        `https://api-v1.apkpure.net/v3/search_suggestion?q=${encodeURIComponent(query)}`,
        { timeout: 10000, headers: PURE_HEADERS }
      )

      const app = searchRes.data?.data?.[0]
      if (!app) return m.reply('✘ No encontré ninguna aplicación con ese nombre.')

      await m.reply('⏳ Obteniendo APK, espera un momento...')

      const data = await getApkData(app.package_name, { name: app.name, icon: app.icon })

      if (!data?.download) {
        return m.reply('✘ No se pudo obtener el enlace de descarga. Intenta de nuevo.')
      }

      const caption = [
        `✦ *${data.name || app.name}*\n`,
        `✧ Paquete  › \`${app.package_name}\``,
        `✧ Versión  › *${data.version || 'Desconocida'}*`,
        `✧ Tamaño   › *${data.size || 'Desconocido'}*\n`,
        `✐ Enviando APK...`,
      ].join('\n')

      // Miniatura + info
      await client.sendMessage(
        m.chat,
        { image: { url: data.icon || app.icon }, caption },
        { quoted: m }
      )

      // Archivo APK
      const safeName = (data.name || app.name).replace(/[^\w\s\-]/gi, '').trim()
      await client.sendMessage(
        m.chat,
        {
          document: { url: data.download },
          fileName: `${safeName}.apk`,
          mimetype: 'application/vnd.android.package-archive',
        },
        { quoted: m }
      )

    } catch (e) {
      console.error('[APK]', e?.message || e)
      m.reply('❌ Error al procesar la solicitud. Intenta de nuevo.')
    }
  },
}
