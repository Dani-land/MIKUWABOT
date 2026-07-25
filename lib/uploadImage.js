import fetch from 'node-fetch'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

function normalizeBuffer(input) {
  if (Buffer.isBuffer(input)) return input
  if (input instanceof Uint8Array) return Buffer.from(input)
  return null
}

function isValidUrl(text) {
  return typeof text === 'string' && /^https?:\/\//i.test(text.trim())
}

async function uploadToCatbox(buffer, mime, ext) {
  const form = new FormData()

  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', buffer, {
    filename: `file.${ext}`,
    contentType: mime
  })

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  })

  if (!res.ok) {
    throw new Error(`Catbox HTTP ${res.status}`)
  }

  const text = (await res.text()).trim()
  if (!isValidUrl(text)) {
    throw new Error(`Respuesta inválida de Catbox: ${text}`)
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
  if (!isValidUrl(text)) {
    throw new Error(`Respuesta inválida de 0x0.st: ${text}`)
  }

  return text
}

export default async function uploadImage(buffer) {
  const input = normalizeBuffer(buffer)

  if (!input) {
    throw new Error('Buffer inválido')
  }

  let type = null
  try {
    type = await fileTypeFromBuffer(input)
  } catch {
    type = null
  }

  const mime = type?.mime || 'application/octet-stream'
  const ext = type?.ext || 'bin'

  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ]

  if (!allowed.includes(mime)) {
    throw new Error(`Formato no soportado: ${mime}`)
  }

  try {
    return await uploadToCatbox(input, mime, ext)
  } catch (e1) {
    try {
      return await uploadTo0x0(input, mime, ext)
    } catch (e2) {
      throw new Error(`Falló upload | Catbox: ${e1.message} | 0x0: ${e2.message}`)
    }
  }
}