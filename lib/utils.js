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

/**
 * Devuelve un JID comparable, quitando el sufijo de dispositivo y
 * convirtiendo números simples al formato de WhatsApp.
 *
 * WhatsApp puede entregar el mismo usuario como PN (número de teléfono)
 * o como LID. La conversión LID -> PN se hace en resolveLidToRealJid;
 * esta función solamente evita que fallen las comparaciones por formato.
 */
export function normalizeJid(jid) {
  if (jid === null || jid === undefined) return ''
  const value = String(jid).trim()
  if (!value) return ''

  const withoutDevice = value.replace(/:\d+(?=@)/, '').toLowerCase()
  if (withoutDevice.includes('@')) return withoutDevice

  const digits = withoutDevice.replace(/\D/g, '')
  return digits ? `${digits}@s.whatsapp.net` : withoutDevice
}

export function sameJid(first, second) {
  return normalizeJid(first) === normalizeJid(second)
}

export function isSocketOwner(client, m, config = {}) {
  const botJid = normalizeJid(client?.user?.id)
  const sender = normalizeJid(m?.sender)
  const owners = (global.owner || []).map(normalizeJid)
  return owners.includes(sender) ||
    sameJid(sender, botJid) ||
    sameJid(sender, config.owner)
}

export async function resolveLidToRealJid(lid, client, groupChatId) {
  const input = lid?.toString().trim()
  if (!input) return input

  const decodedInput = typeof client?.decodeJid === 'function' ? client.decodeJid(input) : input
  if (!decodedInput?.endsWith('@lid')) return decodedInput

  const cacheKey = `${decodedInput}:${groupChatId || ''}`
  if (lidCache.has(cacheKey)) return lidCache.get(cacheKey)

  // Baileys mantiene la tabla oficial PN <-> LID en signalRepository.
  // Esto también funciona en chats privados, donde no existe metadata de grupo.
  try {
    const mapped = await client?.signalRepository?.lidMapping?.getPNForLID?.(decodedInput)
    if (mapped) {
      const realJid = typeof client?.decodeJid === 'function' ? client.decodeJid(mapped) : mapped
      lidCache.set(cacheKey, realJid)
      return realJid
    }
  } catch {
    // La metadata del grupo sigue siendo un fallback válido para versiones
    // de Baileys que todavía no exponen signalRepository.
  }

  if (!groupChatId?.endsWith('@g.us')) {
    lidCache.set(cacheKey, decodedInput)
    return decodedInput
  }

  const lidBase = decodedInput.split('@')[0]
  let metadata = getCachedMetadata(groupChatId)

  if (!metadata) {
    try {
      metadata = await client.groupMetadata(groupChatId)
      groupMetadataCache.set(groupChatId, { metadata, timestamp: Date.now() })
    } catch {
      lidCache.set(cacheKey, decodedInput)
      return decodedInput
    }
  }

  for (const p of metadata.participants || []) {
    // If the participant has a 'lid' field that matches, return their real JID (p.id)
    if (p.lid && p.lid.split('@')[0] === lidBase) {
      const realJid = typeof client?.decodeJid === 'function' ? client.decodeJid(p.id) : p.id
      if (realJid) {
        lidCache.set(cacheKey, realJid)
        return realJid
      }
    }
    // Also check if the id itself matches the lid base (e.g. numeric lid stored in id)
    const idBase = p?.id?.split('@')[0]?.trim()
    if (idBase && idBase === lidBase) {
      const realJid = typeof client?.decodeJid === 'function' ? client.decodeJid(p.id) : p.id
      lidCache.set(cacheKey, realJid)
      return realJid
    }
  }

  lidCache.set(cacheKey, decodedInput)
  return decodedInput
}