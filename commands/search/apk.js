import axios from 'axios'

const PURE_HEADERS = {
  'User-Agent': 'APKPure/3.17.26 (Linux; U; Android 11; en-US) AppleWebKit/537.36',
  'Accept': 'application/json',
}

function first(...vals) {
  for (const v of vals) {
    if (v === undefined || v === null) continue
    if (typeof v === 'string' && !v.trim()) continue
    return v
  }
  return null
}

function asUrl(v) {
  if (!v) return null
  if (typeof v === 'string') return v
  return v.url || v.src || v.downloadUrl || v.download_url || null
}

function normalizeApp(raw, fallback = {}) {
  return {
    name: first(raw?.name, raw?.title, fallback.name, 'APK'),
    packageName: first(raw?.package_name, raw?.packageName, raw?.pn, raw?.pkg, fallback.packageName),
    version: first(raw?.currentVersionName, raw?.version, raw?.versionName, 'Latest'),
    size: first(raw?.size, raw?.file_size, raw?.fileSize, '—'),
    icon: asUrl(first(raw?.icon, raw?.logo, fallback.icon)),
    pageUrl: first(raw?.url, raw?.link, raw?.detail_url, raw?.detailUrl, null),
    raw,
  }
}

function pickSearchItem(data) {
  const d = data?.data

  if (Array.isArray(d) && d.length) return d[0]
  if (Array.isArray(d?.list) && d.list.length) return d.list[0]
  if (Array.isArray(d?.results) && d.results.length) return d.results[0]
  if (Array.isArray(data?.results) && data.results.length) return data.results[0]
  if (Array.isArray(data?.list) && data.list.length) return data.list[0]
  if (d && typeof d === 'object') return d

  return null
}

async function getApkData(packageName, appFallback) {
  const detailEndpoints = [
    `https://api-v2.apkpure.net/v3/app_detail?pn=${encodeURIComponent(packageName)}&hl=es`,
    `https://api-v2.apkpure.net/v3/app_detail?pn=${encodeURIComponent(packageName)}`
  ]

  for (const detailUrl of detailEndpoints) {
    try {
      const detailRes = await axios.get(detailUrl, {
        timeout: 12000,
        headers: PURE_HEADERS
      })

      const detRaw = detailRes.data?.data || detailRes.data?.app || detailRes.data?.result || detailRes.data
      const det = normalizeApp(detRaw, { ...appFallback, packageName })

      const versionCode = first(
        detRaw?.currentVersionCode,
        detRaw?.versionCode,
        detRaw?.latestVersionCode,
        detRaw?.version_code
      )

      if (versionCode) {
        const downloadEndpoints = [
          `https://api-v2.apkpure.net/v3/download_version?pn=${encodeURIComponent(packageName)}&versionCode=${encodeURIComponent(versionCode)}&hl=es`,
          `https://api-v2.apkpure.net/v3/download_version?pn=${encodeURIComponent(packageName)}&versionCode=${encodeURIComponent(versionCode)}`
        ]

        for (const dlUrl of downloadEndpoints) {
          try {
            const dlRes = await axios.get(dlUrl, {
              timeout: 12000,
              headers: PURE_HEADERS
            })

            const assetsRaw =
              dlRes.data?.data?.assets ||
              dlRes.data?.assets ||
              dlRes.data?.data?.downloads ||
              dlRes.data?.downloads ||
              []

            const asset = Array.isArray(assetsRaw) ? assetsRaw[0] : assetsRaw
            const downloadUrl = asUrl(first(asset?.url, asset?.downloadUrl, asset?.download_url))

            if (downloadUrl) {
              const sizeBytes = first(asset?.size, asset?.fileSize, asset?.filesize)
              return {
                name: det.name || appFallback.name,
                version: first(det.version, detRaw?.currentVersionName, 'Latest'),
                size: sizeBytes ? `${(Number(sizeBytes) / 1024 / 1024).toFixed(1)} MB` : '—',
                icon: det.icon || appFallback.icon,
                download: downloadUrl,
                pageUrl: det.pageUrl || appFallback.pageUrl || null
              }
            }
          } catch {}
        }
      }

      if (det.pageUrl) {
        return {
          name: det.name || appFallback.name,
          version: first(det.version, detRaw?.currentVersionName, 'Latest'),
          size: '—',
          icon: det.icon || appFallback.icon,
          download: det.pageUrl,
          pageUrl: det.pageUrl
        }
      }
    } catch {}
  }

  return {
    name: appFallback.name,
    version: 'Latest',
    size: '—',
    icon: appFallback.icon,
    download: `https://d.apkpure.net/b/apk/${encodeURIComponent(packageName)}?version=latest`,
    pageUrl: null
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
      const searchRes = await axios.get(
        `https://api-v1.apkpure.net/v3/search_suggestion?q=${encodeURIComponent(query)}`,
        { timeout: 10000, headers: PURE_HEADERS }
      )

      const appRaw = pickSearchItem(searchRes.data)
      if (!appRaw) {
        return m.reply('✘ No encontré ninguna aplicación con ese nombre.')
      }

      const app = normalizeApp(appRaw)
      if (!app.packageName) {
        return m.reply('✘ No pude obtener el paquete de la app.')
      }

      const data = await getApkData(app.packageName, {
        name: app.name,
        icon: app.icon,
        packageName: app.packageName,
        pageUrl: app.pageUrl
      })

      if (!data?.download) {
        return m.reply('✘ No se pudo obtener el enlace de descarga. Intenta de nuevo.')
      }

      const caption = [
        `✦ *${data.name || app.name}*`,
        `✧ Paquete  › \`${app.packageName}\``,
        `✧ Versión  › *${data.version || 'Desconocida'}*`,
        `✧ Tamaño   › *${data.size || 'Desconocido'}*`,
        `✐ Enviando APK...`
      ].join('\n')

      if (data.icon) {
        await client.sendMessage(
          m.chat,
          { image: { url: data.icon }, caption },
          { quoted: m }
        )
      } else {
        await client.sendMessage(
          m.chat,
          { text: caption },
          { quoted: m }
        )
      }

      const safeName = (data.name || app.name).replace(/[^\w\s\-]/gi, '').trim() || 'app'

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