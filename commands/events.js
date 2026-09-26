import chalk from 'chalk'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import {
    resolveLidToRealJid,
    normalizeJid,
    sameJid,
} from '../lib/utils.js'

const groupMetadataCache = new Map()
const groupMetadataRequests = new Map()
const welcomeTemplatePath = path.resolve(process.cwd(), 'assets/kawaii-welcome.png')
let welcomeTemplatePromise
const execFileAsync = promisify(execFile)

const fallbackProfilePicture = 'https://files.catbox.moe/sxt0he.jpeg'

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

function getParticipantName(participant, metadata, jid, fallback) {
    const participantBase = jidBase(jid)
    const metadataParticipant = (metadata?.participants || []).find((item) =>
        [item?.id, item?.lid, item?.phoneNumber]
            .filter(Boolean)
            .some((identity) => jidBase(identity) === participantBase)
    )

    return cleanDisplayName(
        participant?.pushName ||
        participant?.notify ||
        participant?.name ||
        metadataParticipant?.notify ||
        metadataParticipant?.name,
        fallback
    )
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

    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(8000),
        })
        if (!response.ok) return null
        return Buffer.from(await response.arrayBuffer())
    } catch {
        return null
    }
}

async function makeCircularAvatar(buffer, tempDir, size = 270) {
    const sourcePath = path.join(tempDir, 'profile-picture')
    const avatarPath = path.join(tempDir, 'profile-picture-circle.png')
    await fs.writeFile(sourcePath, buffer)

    await execFileAsync('magick', [
        sourcePath,
        '-auto-orient',
        '-thumbnail', `${size}x${size}^`,
        '-gravity', 'center',
        '-extent', `${size}x${size}`,
        '-alpha', 'on',
        '-background', 'none',
        '(',
        '-size', `${size}x${size}`,
        'xc:none',
        '-fill', 'white',
        '-draw', `circle ${size / 2},${size / 2} ${size / 2},0`,
        ')',
        '-compose', 'DstIn',
        '-composite',
        avatarPath,
    ], { timeout: 15000 })

    return avatarPath
}

async function makeWelcomeCard({ profilePictureUrl, displayName }) {
    const template = await getWelcomeTemplate()
    if (!template) return profilePictureUrl || fallbackProfilePicture

    const name = escapeXml(`@${displayName}`)
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'miku-welcome-'))

    try {
        const templatePath = path.join(tempDir, 'template.png')
        const nameOverlayPath = path.join(tempDir, 'name.svg')
        const outputPath = path.join(tempDir, 'welcome.png')
        await fs.writeFile(templatePath, template)

        const avatar = await downloadImage(profilePictureUrl)
        const avatarPath = avatar ? await makeCircularAvatar(avatar, tempDir) : null

        await fs.writeFile(nameOverlayPath, `
        <svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 1254 1254">
            <rect width="1254" height="1254" fill="none"/>
            <defs>
                <filter id="name-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                    <feOffset dx="0" dy="4" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.75"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
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
                filter="url(#name-shadow)"
            >${name}</text>
        </svg>
        `)

        const imageArgs = [templatePath]
        if (avatarPath) {
            imageArgs.push(
                avatarPath,
                '-geometry', '+178+402',
                '-composite',
            )
        }
        imageArgs.push('-background', 'none', nameOverlayPath, '-composite', outputPath)

        await execFileAsync('magick', imageArgs, { timeout: 15000 })
        return await fs.readFile(outputPath)
    } catch (error) {
        console.error(`[WELCOME IMAGE] No se pudo generar la tarjeta: ${error.message}`)
        return template
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
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
            const originalJid = participant.id || participant.lid || participant.phoneNumber
            if (!originalJid) continue

            let jid = await resolveLidToRealJid(originalJid, client, anu.id)
            if (jid?.endsWith('@lid') && participant.phoneNumber) {
                jid = participant.phoneNumber
            }
            const mentionJid = jid || originalJid
            const phone = jidBase(mentionJid)
            const displayName = getParticipantName(participant, metadata, mentionJid, phone || 'Usuario')
            const profilePictureUrl = await client.profilePictureUrl(mentionJid, 'image').catch(() => null)
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
