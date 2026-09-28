import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import {
    resolveLidToRealJid,
    normalizeJid,
    sameJid,
} from '../lib/utils.js'

const groupMetadataCache = new Map()
const groupMetadataRequests = new Map()
const welcomeTemplatePath = path.resolve(process.cwd(), 'assets/kawaii-welcome.png')
let welcomeTemplatePromise

const fallbackProfilePicture = 'https://files.catbox.moe/sxt0he.jpeg'
const welcomeAvatar = {
    size: 260,
    left: 290,
    top: 500,
    centerX: 420,
    centerY: 630,
    frameRadius: 150,
    wellRadius: 140,
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function cleanDisplayName(value, fallback) {
    const name = String(value || '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    return (name || fallback).slice(0, 28)
}

function jidBase(value) {
    return String(value || '')
        .split('@')[0]
        .split(':')[0]
}

function toUsableJid(value) {
    const jid = String(value || '').trim()
    if (!jid) return ''
    if (jid.includes('@')) return jid
    return /^\d+$/.test(jid) ? `${jid}@s.whatsapp.net` : jid
}

function uniqueJids(values) {
    return [...new Set(values
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => value.trim()))]
}

function findMetadataParticipant(metadata, identities) {
    const identityBases = new Set(
        identities
            .filter(Boolean)
            .map((identity) => jidBase(identity))
            .filter(Boolean)
    )

    return (metadata?.participants || []).find((item) =>
        [item?.id, item?.lid, item?.phoneNumber]
            .filter(Boolean)
            .some((identity) => identityBases.has(jidBase(identity)))
    )
}

function getStoredUserName(identities) {
    const users = global.db?.data?.users || {}
    for (const identity of identities) {
        const exactName = users[identity]?.name
        if (exactName) return exactName
    }

    const matchingEntry = Object.entries(users).find(([storedJid, user]) =>
        identities.some((identity) => sameJid(storedJid, identity)) && user?.name
    )
    return matchingEntry?.[1]?.name || ''
}

function getParticipantContext(participant, metadata, originalJid, resolvedJid) {
    const initialIdentities = uniqueJids([
        resolvedJid,
        originalJid,
        participant?.jid,
        participant?.id,
        participant?.lid,
        participant?.phoneNumber,
    ])
    const metadataParticipant = findMetadataParticipant(
        metadata,
        initialIdentities
    )
    const identities = uniqueJids([
        ...initialIdentities,
        metadataParticipant?.id,
        metadataParticipant?.lid,
        metadataParticipant?.phoneNumber,
    ])
    const phoneJid = identities
        .map(toUsableJid)
        .find((identity) => identity.endsWith('@s.whatsapp.net'))
    const phone = jidBase(phoneJid || resolvedJid || originalJid)
    const storedName = getStoredUserName(identities)
    const displayName = cleanDisplayName(
        participant?.pushName ||
        participant?.notify ||
        participant?.name ||
        metadataParticipant?.pushName ||
        metadataParticipant?.notify ||
        metadataParticipant?.name ||
        storedName,
        phone || 'Usuario'
    )

    return {
        metadataParticipant,
        identities,
        phone,
        displayName,
    }
}

async function getProfilePictureUrl(client, identities) {
    for (const identity of identities) {
        const decodedIdentity = typeof client?.decodeJid === 'function'
            ? client.decodeJid(toUsableJid(identity))
            : toUsableJid(identity)
        if (!decodedIdentity) continue

        for (const type of ['image', 'preview']) {
            const profilePictureUrl = await client.profilePictureUrl(
                decodedIdentity,
                type
            ).catch(() => null)
            if (profilePictureUrl) return profilePictureUrl
        }
    }

    return null
}

async function getWelcomeTemplate() {
    if (!welcomeTemplatePromise) {
        welcomeTemplatePromise = fs.readFile(welcomeTemplatePath)
            .catch((error) => {
                console.error(`[WELCOME IMAGE] No se pudo cargar la plantilla: ${error.message}`)
                return null
            })
    }
    return welcomeTemplatePromise
}

async function downloadImage(url) {
    if (!url) return null

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(url, {
                headers: {
                    accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'user-agent': 'Mozilla/5.0 MikuWabot/1.0',
                },
                signal: AbortSignal.timeout(8000),
            })
            if (!response.ok) continue

            const buffer = Buffer.from(await response.arrayBuffer())
            if (buffer.length > 0) return buffer
        } catch {
            // WhatsApp puede devolver temporalmente una URL caducada.
        }
    }

    return null
}

async function makeCircularAvatar(buffer, size = 270) {
    const circleMask = Buffer.from(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
        </svg>
    `)

    return sharp(buffer)
        .rotate()
        .resize(size, size, { fit: 'cover' })
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .png()
        .toBuffer()
}

async function makeWelcomeCard({ profilePictureUrl, displayName }) {
    const template = await getWelcomeTemplate()
    if (!template) return profilePictureUrl || fallbackProfilePicture

    const name = escapeXml(`@${displayName}`)

    try {
        const avatar = await downloadImage(profilePictureUrl)
        let avatarBuffer = null
        if (avatar) {
            try {
                avatarBuffer = await makeCircularAvatar(avatar, welcomeAvatar.size)
            } catch (error) {
                console.error(`[WELCOME AVATAR] No se pudo preparar la foto: ${error.message}`)
            }
        }

        const nameOverlay = Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 1254 1254">
            <rect width="1254" height="1254" fill="none"/>
            <text
                x="627"
                y="375"
                text-anchor="middle"
                font-family="Arial, sans-serif"
                font-size="42"
                font-weight="700"
                fill="#d9f7ff"
                stroke="#062c40"
                stroke-width="7"
                paint-order="stroke"
            >${name}</text>
        </svg>
        `)

        const avatarFrame = Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 1254 1254">
            <circle
                cx="${welcomeAvatar.centerX}"
                cy="${welcomeAvatar.centerY}"
                r="${welcomeAvatar.frameRadius}"
                fill="none"
                stroke="#062c40"
                stroke-width="16"
                opacity="0.95"
            />
            <circle
                cx="${welcomeAvatar.centerX}"
                cy="${welcomeAvatar.centerY}"
                r="${welcomeAvatar.frameRadius}"
                fill="none"
                stroke="#b9f5ff"
                stroke-width="7"
                opacity="0.95"
            />
        </svg>
        `)

        const avatarWell = Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 1254 1254">
            <circle
                cx="${welcomeAvatar.centerX}"
                cy="${welcomeAvatar.centerY}"
                r="${welcomeAvatar.wellRadius}"
                fill="#062c40"
            />
        </svg>
        `)

        const layers = []
        if (avatarBuffer) {
            // Hide the template's placeholder icon first, then place the
            // smaller profile photo inside it with a clean margin.
            layers.push({ input: avatarWell, left: 0, top: 0 })
            layers.push({
                input: avatarBuffer,
                left: welcomeAvatar.left,
                top: welcomeAvatar.top,
            })
            // Keep a clean decorative ring above the photo.
            layers.push({ input: avatarFrame, left: 0, top: 0 })
        }

        // Render the name separately from the optional avatar. A failed
        // profile-picture download must never remove the name or template.
        layers.push({ input: nameOverlay, left: 0, top: 0 })
        return await sharp(template)
            .composite(layers)
            .png()
            .toBuffer()
    } catch (error) {
        console.error(`[WELCOME IMAGE] No se pudo generar la tarjeta: ${error.message}`)
        return template
    }
}

async function getGroupMetadata(client, groupId) {
    const cached = groupMetadataCache.get(groupId)
    if (cached && Date.now() - cached.timestamp < 60 * 1000) {
        return cached.metadata
    }

    if (groupMetadataRequests.has(groupId)) {
        return groupMetadataRequests.get(groupId)
    }

    const request = Promise.race([
        client.groupMetadata(groupId).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]).then((metadata) => {
        if (metadata) {
            groupMetadataCache.set(groupId, {
                metadata,
                timestamp: Date.now(),
            })
        }
        return metadata || (cached && cached.metadata) || null
    }).finally(() => {
        groupMetadataRequests.delete(groupId)
    })

    groupMetadataRequests.set(groupId, request)
    return request
}

export const participantsUpdate = async (client, anu) => {
    try {
        if (!anu?.id || !anu.id.endsWith('@g.us')) return

        if (!global.db.data.chats[anu.id]) {
            global.db.data.chats[anu.id] = {}
        }
        const chat = global.db.data.chats[anu.id]
        if (typeof chat.welcome !== 'boolean') chat.welcome = true
        if (typeof chat.alerts !== 'boolean') chat.alerts = true

        const metadata = await getGroupMetadata(client, anu.id) || {
            subject: 'este grupo',
            participants: [],
        }
        const botId = normalizeJid(client.user.id)
        const primaryBotId = chat?.primaryBot
        const isPrimary = !primaryBotId || sameJid(primaryBotId, botId)

        const entries = Array.isArray(anu.participants) ? anu.participants : []
        const metadataCount = metadata.participants.length
        const memberCount = metadataCount > 0 ? metadataCount : entries.length

        for (const entry of entries) {
            const participant = typeof entry === 'string' ? { id: entry } : (entry || {})
            const originalJid =
                participant.id ||
                participant.jid ||
                participant.lid ||
                participant.phoneNumber
            if (!originalJid) continue

            const jid = await resolveLidToRealJid(originalJid, client, anu.id)
            const context = getParticipantContext(
                participant,
                metadata,
                originalJid,
                jid
            )
            const mentionJid = context.identities
                .map(toUsableJid)
                .find((identity) => identity.endsWith('@s.whatsapp.net')) ||
                toUsableJid(jid || originalJid)
            const phone = jidBase(mentionJid)
            const displayName = context.displayName
            const profilePictureUrl = await getProfilePictureUrl(
                client,
                context.identities
            )
            const welcomeCard = await makeWelcomeCard({
                profilePictureUrl,
                displayName,
            })

            // ==================== BIENVENIDA ====================
            if (anu.action === 'add' && chat?.welcome && isPrimary) {
                const caption = `ฅ^•ﻌ•^ฅ ᗷIᗴᑎᐯᗴᑎIᗪO(ᗩ)\n\n` +
                    `☁︎ @${phone}\n` +
                    `♡ ${displayName}\n` +
                    `ꕤ ᘜᖇᑌᑭO ›⠀⠀${metadata.subject}\n` +
                    `ʕ·ᴥ·ʔ ᗰIᗴᗰᗷᖇOՏ ›⠀${memberCount}\n\n` +
                    `𝚄𝚜𝚊 *#𝚑𝚎𝚕𝚙* 𝚙𝚊𝚛𝚊 𝚟𝚎𝚛 𝚕𝚊 𝚕𝚒𝚜𝚝𝚊 𝚍𝚎 𝚌𝚘𝚖𝚊𝚗𝚍𝚘𝚜.`

                await client.sendMessage(anu.id, {
                    image: welcomeCard,
                    caption: caption,
                    mentions: [mentionJid],
                })
            }

            // ==================== DESPEDIDA ====================
            if ((anu.action === 'remove' || anu.action === 'leave') && chat?.welcome && isPrimary) {
                const caption = `᯽ Ȃ̈D̑̈Ȋ̈Ȏ̈S̑̈\n\n` +
                    `ᰔᩚ @${phone}\n` +
                    `♡ ${displayName}\n` +
                    `ʕ·ᴥ·ʔ ᗰIᗴᗰᗷᖇOՏ ›⠀${memberCount}\n\n` +
                    `✿ 𝙴𝚜𝚙𝚎𝚛𝚎𝚖𝚘𝚜 𝚚𝚞𝚎 𝚛𝚎𝚐𝚛𝚎𝚜𝚎𝚜 𝚙𝚛𝚘𝚗𝚝𝚘`

                await client.sendMessage(anu.id, {
                    image: welcomeCard,
                    caption: caption,
                    mentions: [mentionJid],
                })
            }

            // ==================== PROMOTE / DEMOTE ====================
            if (anu.action === 'promote' && chat?.alerts && isPrimary) {
                const usuario = anu.author
                await client.sendMessage(anu.id, {
                    text: `✧ @${phone} ha sido promovido a *Administrador* por @${usuario?.split('@')[0] || 'Sistema'}.`,
                    mentions: [jid, usuario].filter(Boolean)
                })
            }

            if (anu.action === 'demote' && chat?.alerts && isPrimary) {
                const usuario = anu.author
                await client.sendMessage(anu.id, {
                    text: `✧ @${phone} ha sido degradado de *Administrador* por @${usuario?.split('@')[0] || 'Sistema'}.`,
                    mentions: [jid, usuario].filter(Boolean)
                })
            }
        }
    } catch (err) {
        console.log(chalk.gray(`[ EVENT ERROR ]  → ${err}`))
    }
}
