const groupMetadataCache = new Map()
const lidCache = new Map()
const metadataTTL = 5000 // 5 segundos de frescura máxima

// ── Caché de thumbnails para externalAdReply ─────────────────────────────────
const iconBufferCache = new Map()
const ICON_CACHE_TTL = 30 * 60 * 1000 // 30 minutos

/**
 * Descarga una imagen y la devuelve como Buffer.
 * Usa caché para no hacer fetch en cada mensaje.
 * Si falla (URL inaccesible, red, etc.) devuelve null sin lanzar error.
 */
export async function fetchIconBuffer(url) {
  if (!url || !url.startsWith('http')) return null
  const now = Date.now()
  const cached = iconBufferCache.get(url)
  if (cached && (now - cached.ts) < ICON_CACHE_TTL) return cached.buf
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    iconBufferCache.set(url, { buf, ts: now })
    return buf
  } catch {
    return null
  }
}
// ─────────────────────────────────────────────────────────────────────────────

setInterval(() => {
  lidCache.clear()
}, 10 * 60 * 1000)

function getCachedMetadata(groupChatId) {
  const cached = groupMetadataCache.get(groupChatId)
  if (!cached || Date.now() - cached.timestamp > metadataTTL) return null
  return cached.metadata
}

function normalizeToJid(phone) {
  if (!phone) return null
  const base = typeof phone === 'number' ? phone.toString() : phone.replace(/\D/g, '')
  return base ? `${base}@s.whatsapp.net` : null
}

// Evita que una llamada colgada (groupMetadata sin responder) trabe todo el bot.
function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

export async function resolveLidToRealJid(lid, client, groupChatId) {
  const input = lid?.toString().trim()
  if (!input || !groupChatId?.endsWith('@g.us')) return input

  if (input.endsWith('@s.whatsapp.net')) return input

  if (lidCache.has(input)) return lidCache.get(input)

  const lidBase = input.split('@')[0]
  let metadata = getCachedMetadata(groupChatId)

  if (!metadata) {
    const TIMEOUT = Symbol('timeout')
    const result = await withTimeout(
      client.groupMetadata(groupChatId).catch(() => null),
      8000,
      TIMEOUT
    )

    if (result === TIMEOUT) {
      console.warn(`[ ⚠️ ] groupMetadata (resolveLid) tardó más de 8s en ${groupChatId} — se sigue sin bloquear.`)
      // No cacheamos este fallo como definitivo: solo devolvemos el input tal cual
      // por esta vez, sin guardarlo en lidCache, para reintentar en el próximo mensaje.
      return input
    }

    if (!result) {
      return lidCache.set(input, input), input
    }

    metadata = result
    groupMetadataCache.set(groupChatId, { metadata, timestamp: Date.now() })
  }

  for (const p of metadata.participants || []) {
    // If the participant has a 'lid' field that matches, return their real JID (p.id)
    if (p.lid && p.lid.split('@')[0] === lidBase) {
      const realJid = p.id
      if (realJid) return lidCache.set(input, realJid), realJid
    }
    // Also check if the id itself matches the lid base (e.g. numeric lid stored in id)
    const idBase = p?.id?.split('@')[0]?.trim()
    if (idBase && idBase === lidBase) return lidCache.set(input, p.id), p.id
  }

  return lidCache.set(input, input), input
}
