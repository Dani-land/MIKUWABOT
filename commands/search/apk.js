import axios from 'axios'

// API pública y documentada de Aptoide (no requiere API key)
// Docs: https://webservices.aptoide.com/webservices/docs/7/apps/search
const APTOIDE_SEARCH_URL = 'https://ws75.aptoide.com/api/7/apps/search'

function formatSize(bytes) {
  if (!bytes) return '—'
  const mb = Number(bytes) / 1024 / 1024
  return `${mb.toFixed(1)} MB`
}

async function searchApk(query) {
  const res = await axios.get(APTOIDE_SEARCH_URL, {
    timeout: 12000,
    params: {
      query,
      limit: 5,
      // 'trusted' filtra apps marcadas como confiables por Aptoide (menos riesgo de spam/duplicados raros)
    },
  })

  const list = res.data?.datalist?.list
  if (!Array.isArray(list) || !list.length) return null

  // Preferimos el primer resultado que tenga un link de descarga válido
  const app = list.find((a) => a?.file?.path) || list[0]
  if (!app?.file?.path) return null

  return {
    name: app.name,
    packageName: app.package,
    version: app.file?.vername || 'Desconocida',
    size: formatSize(app.file?.filesize),
    icon: app.icon || null,
    download: app.file.path,
    malware: app.file?.malware?.rank || null, // 'TRUSTED', 'WARN', 'MALWARE', etc.
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
      const data = await searchApk(query)

      if (!data) {
        return m.reply('✘ No encontré ninguna aplicación con ese nombre.')
      }

      // Si Aptoide marca la app como maliciosa, no la mandamos
      if (data.malware && data.malware !== 'TRUSTED' && data.malware !== 'WARN') {
        return m.reply('✘ Esa app fue marcada como insegura por Aptoide, no la voy a enviar.')
      }

      const caption = [
        `✦ *${data.name}*`,
        `✧ Paquete  › \`${data.packageName}\``,
        `✧ Versión  › *${data.version}*`,
        `✧ Tamaño   › *${data.size}*`,
        `✐ Enviando APK...`,
      ].join('\n')

      if (data.icon) {
        await client.sendMessage(m.chat, { image: { url: data.icon }, caption }, { quoted: m })
      } else {
        await client.sendMessage(m.chat, { text: caption }, { quoted: m })
      }

      const safeName = data.name.replace(/[^\w\s-]/gi, '').trim() || 'app'

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
      // Log detallado para poder diagnosticar sin adivinar
      console.error('[APK] Error:', e?.response?.status, e?.response?.data || e?.message || e)
      m.reply('❌ Error al procesar la solicitud. Intenta de nuevo.')
    }
  },
}
