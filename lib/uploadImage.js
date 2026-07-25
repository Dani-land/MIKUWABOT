import fetch from 'node-fetch'
import FormData from 'form-data'

function bufferToUint8Array(buffer) {
  if (Buffer.isBuffer(buffer)) return buffer
  if (buffer instanceof Uint8Array) return Buffer.from(buffer)
  return null
}

function detectFileType(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return null

  const b = buffer

  // Images
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }

  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' }
  }

  if (
    b.length >= 12 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' }
  }

  if (
    b.length >= 6 &&
    (b.toString('ascii', 0, 6) === 'GIF87a' ||
      b.toString('ascii', 0, 6) === 'GIF89a')
  ) {
    return { mime: 'image/gif', ext: 'gif' }
  }

  // Video
  if (b.length >= 12) {
    const box = b.toString('ascii', 4, 8)
    const brand = b.toString('ascii', 8, 12)
    if (box === 'ftyp') {
      if (
        brand.includes('mp4') ||
        brand.includes('isom') ||
        brand.includes('avc1') ||
        brand.includes('m4v')
      ) {
        return { mime: 'video/mp4', ext: 'mp4' }
      }
    }
  }

  if (
    b.length >= 4 &&
    b[0] === 0x1a &&
    b[1] === 0x45 &&
    b[2] === 0xdf &&
    b[3] === 0xa3
  ) {
    return { mime: 'video/webm', ext: 'webm' }
  }

  // Audio
  if (
    b.length >= 3 &&
    b.toString('ascii', 0, 3) === 'ID3'
  ) {
    return { mime: 'audio/mpeg', ext: 'mp3' }
  }

  if (
    b.length >= 2 &&
    b[0] === 0xff &&
    (b[1] & 0xe0) === 0xe0
  ) {
    return { mime: 'audio/mpeg', ext: 'mp3' }
  }

  if (
    b.length >= 4 &&
    b.toString('ascii', 0, 4) === 'OggS'
  ) {
    return { mime: 'audio/ogg', ext: 'ogg' }
  }

  if (
    b.length >= 12 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return { mime: 'audio/wav', ext: 'wav' }
  }

  return null
}

function safeExtFromMime(mime) {
  switch (mime) {
    case 'image/jpeg': return 'jpg'
    case 'image/png': return 'png'
    case 'image/webp': return 'webp'
    case 'image/gif': return 'gif'
    case 'video/mp4': return 'mp4'
    case 'video/webm': return 'webm'
    case 'audio/mpeg': return 'mp3'
    case 'audio/ogg': return 'ogg'
    case 'audio/wav': return 'wav'
    default: return 'bin'
  }
}

function normalizeUrl(text) {
  if (!text) return ''
  return String(text).trim()
}

async function uploadToCatbox(buffer, mime, ext) {
  const form = new FormData()
  form.append('fileToUpload', buffer, {
    filename: `file.${ext}`,
    contentType: mime
  })
  form.append('reqtype', 'fileupload')

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  })

  if (!res.ok) {
    throw new Error(`Catbox HTTP ${res.status}`)
  }

  const text = (await res.text()).trim()
  if (!/^https?:\/\//i.test(text)) {
    throw new Error('Respuesta inválida de Catbox')
  }

  return text
}

async function uploadTo0x0(buffer, mime, ext) {
  const form = new FormData()
  form.append('file', buffer, {
    filename: `file.${ext}`,
    contentType: mime
  })

  const res = await fetch('https://0x0.st', {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  })

  if (!res.ok) {
    throw new Error(`0x0.st HTTP ${res.status}`)
  }

  const text = (await res.text()).trim()
  if (!/^https?:\/\//i.test(text)) {
    throw new Error('Respuesta inválida de 0x0.st')
  }

  return text
}

async function uploadToPomf(buffer, mime, ext) {
  const form = new FormData()
  form.append('files[]', buffer, {
    filename: `file.${ext}`,
    contentType: mime
  })

  const res = await fetch('https://pomf.lain.la/upload.php', {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  })

  if (!res.ok) {
    throw new Error(`Pomf HTTP ${res.status}`)
  }

  const json = await res.json()

  if (!json?.success || !json?.files?.[0]?.url) {
    throw new Error('Respuesta inválida de Pomf')
  }

  return normalizeUrl(json.files[0].url)
}

export default async function uploadImage(buffer) {
  const input = bufferToUint8Array(buffer)

  if (!input) {
    throw new Error('Buffer inválido')
  }

  const type = detectFileType(input)

  const mime = type?.mime || 'application/octet-stream'
  const ext = type?.ext || safeExtFromMime(mime)

  const uploaders = [
    async () => uploadToCatbox(input, mime, ext),
    async () => uploadTo0x0(input, mime, ext),
    async () => uploadToPomf(input, mime, ext)
  ]

  let lastError = null

  for (const upload of uploaders) {
    try {
      const url = await upload()
      if (url && /^https?:\/\//i.test(url)) return url
      throw new Error('URL inválida')
    } catch (e) {
      lastError = e
    }
  }

  throw new Error(
    `Falló upload | ${lastError?.message || 'Sin detalle'}`
  )
}