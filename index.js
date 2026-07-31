import "./settings.js"
import handler from './main.js'
import { participantsUpdate } from './commands/events.js'
import {
  Browsers,
  makeWASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidDecode,
  DisconnectReason,
} from "@whiskeysockets/baileys"
import cfonts from 'cfonts'
import gradient from 'gradient-string'
import pino from "pino"
import crypto from 'crypto'
import chalk from "chalk"
import fs from "fs"
import path from "path"
import boxen from 'boxen'
import readline from "readline"
import os from "os"
import qrcode from "qrcode-terminal"
import parsePhoneNumber from "awesome-phonenumber"
import { smsg } from "./lib/message.js"
import db from "./lib/system/database.js"
import { startSubBot } from './lib/subs.js'
import { exec, execSync } from "child_process"
import moment from 'moment-timezone'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const log = {
  info:    (msg) => console.log(chalk.bgBlue.white.bold(' ℹ  INFO ')   + '  ' + chalk.blueBright(msg)),
  success: (msg) => console.log(chalk.bgGreen.black.bold(' ✔  OK ')     + '  ' + chalk.greenBright(msg)),
  warn:    (msg) => console.log(chalk.bgYellow.black.bold(' ⚠  AVISO ') + '  ' + chalk.yellow(msg)),
  warning: (msg) => console.log(chalk.bgYellow.black.bold(' ⚠  AVISO ') + '  ' + chalk.yellow(msg)),
  error:   (msg) => console.log(chalk.bgRed.white.bold(' ✖  ERROR ')   + '  ' + chalk.redBright(msg)),
}

const print = (label, value) =>
  console.log(`${chalk.green.bold("║")} ${chalk.cyan.bold(label.padEnd(16))}${chalk.magenta.bold(":")} ${value}`)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, (answer) => resolve(answer.trim())))

const DIGITS = (s = "") => String(s).replace(/\D/g, "")

function normalizePhoneForPairing(input) {
  let s = DIGITS(input)
  if (!s) return ""
  if (s.startsWith("0")) s = s.replace(/^0+/, "")
  if (s.length === 10 && s.startsWith("3")) s = "57" + s
  if (s.startsWith("52") && !s.startsWith("521") && s.length >= 12) s = "521" + s.slice(2)
  if (s.startsWith("54") && !s.startsWith("549") && s.length >= 11) s = "549" + s.slice(2)
  return s
}

export async function uPLoader() {
  const TOTAL_TIME = 4500
  const STEPS = 100
  const BAR_SIZE = 42
  const VER = global.version?.replace('^', '') || '3.1.0'

  const phases = [
    { until: 25,  color: chalk.hex('#ff6b6b'), label: '⚡ Iniciando módulos del sistema...' },
    { until: 55,  color: chalk.hex('#feca57'), label: '📦 Cargando comandos y plugins...' },
    { until: 80,  color: chalk.hex('#48dbfb'), label: '🔌 Conectando servicios externos...' },
    { until: 101, color: chalk.hex('#1dd1a1'), label: '✅ Todo listo, conectando a WhatsApp...' },
  ]

  for (let i = 0; i <= STEPS; i++) {
    const filled = Math.floor((i / 100) * BAR_SIZE)
    const phase = phases.find(p => i < p.until) || phases[phases.length - 1]
    const bar = phase.color('█'.repeat(filled)) + chalk.gray('░'.repeat(BAR_SIZE - filled))
    const pct = chalk.bold.white(`${String(i).padStart(3)}%`)
    const border = chalk.hex('#c8a2c8').bold

    process.stdout.write(
      '\x1b[2J\x1b[0f' +
      border(`\n  ╔${'═'.repeat(BAR_SIZE + 10)}╗\n`) +
      border('  ║') + chalk.bold.white(`    ✦ MIKUWABOT-MD  v${VER}`.padEnd(BAR_SIZE + 8)) + border('  ║\n') +
      border('  ║') + chalk.gray(`    ☕ made by ☕︎Danielrxz`.padEnd(BAR_SIZE + 8)) + border('  ║\n') +
      border(`  ╚${'═'.repeat(BAR_SIZE + 10)}╝\n\n`) +
      `  ${bar} ${pct}\n\n` +
      `  ${phase.label}\n`
    )
    await new Promise(r => setTimeout(r, TOTAL_TIME / STEPS))
  }

  console.clear()

  cfonts.say('MIKU|BOT', {
    font: 'block',
    align: 'center',
    colors: ['cyan', 'magenta'],
    background: 'transparent',
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
  })

  cfonts.say(`☕  Danielrxz  •  v${VER}`, {
    font: 'console',
    align: 'center',
    gradient: ['magenta', 'cyan'],
  })

  console.log('\n' + boxen(
    chalk.yellow.bold('  Seleccione el método de inicio:\n\n') +
    chalk.green.bold('  1') + chalk.white(' ➜ Código QR           ') + chalk.gray('(escanea con la cámara)\n') +
    chalk.cyan.bold('  2') + chalk.white(' ➜ Código de 8 dígitos ') + chalk.gray('(vincula por número)'),
    {
      padding: 1,
      margin: { left: 4, right: 4 },
      borderStyle: 'round',
      borderColor: 'magenta',
      title: chalk.magenta.bold(' 🚀 INICIO DE SESIÓN '),
      titleAlignment: 'center',
    }
  ) + '\n')

  let opt
  while (!['1', '2'].includes(opt)) {
    opt = await question(chalk.magentaBright('  ➤ Opción [1/2]: '))
  }
  return opt
}

const BOT_TYPES = [
  { name: 'SubBot', folder: './Sessions/Subs', starter: startSubBot }
]

const queue = []
let running = false
const DELAY_NORMAL = 300
const DELAY_AFTER_RATELIMIT = 3000

global.conns = global.conns || []
const reconnecting = new Set()

async function loadBots() {
  for (const { name, folder, starter } of BOT_TYPES) {
    if (!fs.existsSync(folder)) continue
    const botIds = fs.readdirSync(folder)

    for (const userId of botIds) {
      const sessionPath = path.join(folder, userId)
      const credsPath = path.join(sessionPath, 'creds.json')

      if (!fs.existsSync(credsPath)) continue
      if (global.conns.some((conn) => conn.userId === userId)) continue
      if (reconnecting.has(userId)) continue

      try {
        reconnecting.add(userId)
        await starter(null, null, 'Auto reconexión', false, userId, sessionPath)
      } catch (e) {
        reconnecting.delete(userId)
      }

      await new Promise((res) => setTimeout(res, 2500))
    }
  }

  setTimeout(loadBots, 60 * 1000)
}

;(async () => { await loadBots() })()

const realizarLimpieza = () => {
  log.info('Ejecutando revisión de inactividad...')
  const users = global.db?.data?.users
  if (!users) return

  const quinceDias = 15 * 24 * 60 * 60 * 1000
  const ahora = Date.now()
  let contador = 0

  Object.keys(users).forEach(jid => {
    const user = users[jid]
    const ultimaVez = user.lastSeen ? new Date(user.lastSeen).getTime() : 0

    if (ahora - ultimaVez > quinceDias) {
      const esOwner = global.owner?.some(owner => jid.includes(owner))
      if (!esOwner && jid !== global.client?.user?.id) {
        delete global.db.data.users[jid]
        contador++
      }
    }
  })

  if (contador > 0) {
    global.saveDatabase?.()
    try { global.db.conn?.prepare('VACUUM').run() } catch (e) {}
    log.success(`Limpieza terminada: ${contador} usuarios inactivos eliminados.`)
  }
}

let LOGIN_METHOD = null
let cleanupInterval = null

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: "silent" })

  console.info = () => {}
  console.debug = () => {}

  const clientt = makeWASocket({
    version,
    logger,
    browser: Browsers.macOS('Chrome'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async () => undefined,
    keepAliveIntervalMs: 45000,
    maxIdleTimeMs: 60000,
  })

  patchSendMessage(clientt)
  global.client = clientt
  clientt.isInit = false
  // El bot debe procesar mensajes recibidos, no solo los enviados por él.
  clientt.public = true
  clientt.ev.on("creds.update", saveCreds)

  if (!clientt.authState.creds.registered) {
    console.clear()
    if (LOGIN_METHOD === '2') {
      console.log(
        chalk.bold.redBright('\nIngrese su número de WhatsApp\n') +
        chalk.yellowBright('Ejemplo: +57301XXXXXXX\n')
      )

      const fixed = await question(chalk.magentaBright('➤ Número: '))
      const phoneNumber = normalizePhoneForPairing(fixed)

      try {
        const pairing = await clientt.requestPairingCode(phoneNumber)
        console.log(
          chalk.bgMagenta.white.bold('\n CÓDIGO DE VINCULACIÓN ') +
          '\n\n' +
          chalk.white.bold(pairing) +
          '\n'
        )
      } catch (err) {
        console.log(chalk.red('❌ Error al generar código'))
        exec('rm -rf ./Sessions/Owner/*')
        process.exit(1)
      }
    }
  }

  clientt.sendText = (jid, text, quoted = "", options) =>
    clientt.sendMessage(jid, { text: text, ...options }, { quoted })

  clientt.ev.on("connection.update", async (update) => {
    const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update

    if (qr && LOGIN_METHOD === '1') {
      console.clear()
      console.log(chalk.cyan.bold('📸 ESCANEA ESTE CÓDIGO QR\n'))
      qrcode.generate(qr, { small: true })
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || 0

      if (reason === DisconnectReason.connectionLost) {
        log.warning("Se perdió la conexión al servidor, intento reconectarme..")
        startBot()
      } else if (reason === DisconnectReason.connectionClosed) {
        log.warning("Conexión cerrada, intentando reconectarse...")
        startBot()
      } else if (reason === DisconnectReason.restartRequired) {
        log.warning("Es necesario reiniciar..")
        startBot()
      } else if (reason === DisconnectReason.timedOut) {
        log.warning("Tiempo de conexión agotado, intentando reconectarse...")
        startBot()
      } else if (reason === DisconnectReason.badSession) {
        log.warning("Eliminar sesión y escanear nuevamente...")
        startBot()
      } else if (reason === DisconnectReason.connectionReplaced) {
        log.warning("Primero cierre la sesión actual...")
      } else if (reason === DisconnectReason.loggedOut) {
        log.warning("Escanee nuevamente y ejecute...")
        exec("rm -rf ./Sessions/Owner/*")
        process.exit(1)
      } else if (reason === DisconnectReason.forbidden) {
        log.error("Error de conexión, escanee nuevamente y ejecute...")
        exec("rm -rf ./Sessions/Owner/*")
        process.exit(1)
      } else if (reason === DisconnectReason.multideviceMismatch) {
        log.warning("Inicia nuevamente")
        exec("rm -rf ./Sessions/Owner/*")
        process.exit(0)
      } else {
        clientt.end(`Motivo de desconexión desconocido : ${reason}|${connection}`)
        startBot()
      }
    }

    if (connection === "open") {
      const memMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1)
      const botNum = clientt.user?.id ? clientt.decodeJid(clientt.user.id).split('@')[0] : '—'
      const now = moment().tz('America/Mexico_City').format('DD/MM/YYYY HH:mm:ss')
      const row = (icon, label, value) =>
        `  ${icon}  ${chalk.cyan.bold(label.padEnd(10))} ${chalk.gray('›')} ${chalk.white(value)}`

      console.log('\n' + boxen(
        chalk.greenBright.bold('  ✦ BOT CONECTADO EXITOSAMENTE ✦\n\n') +
        row('🤖', 'Bot', 'MikuWabot-MD') + '\n' +
        row('📱', 'Número', botNum) + '\n' +
        row('⚙️ ', 'Versión', global.version?.replace('^', '') || '3.1.0') + '\n' +
        row('🟢', 'Node.js', process.version) + '\n' +
        row('🖥️ ', 'Sistema', os.platform()) + '\n' +
        row('💾', 'Memoria', memMB + ' MB') + '\n' +
        row('🕐', 'Hora', now) + '\n' +
        row('☕', 'Creador', '☕︎Danielrxz'),
        {
          padding: { top: 0, bottom: 1, left: 1, right: 2 },
          margin: { left: 2 },
          borderStyle: 'double',
          borderColor: 'green',
          title: chalk.green.bold(' ✦ WhatsApp Online ✦ '),
          titleAlignment: 'center',
        }
      ) + '\n')

      setTimeout(realizarLimpieza, 10000)
      if (cleanupInterval) clearInterval(cleanupInterval)
      cleanupInterval = setInterval(realizarLimpieza, 24 * 60 * 60 * 1000)
    }

    if (isNewLogin) log.info("Nuevo dispositivo detectado")

    if (receivedPendingNotifications === true) {
      log.warn("Por favor espere aproximadamente 1 minuto...")
      clientt.ev.flush()
    }
  })

  clientt.ev.on("messages.upsert", async ({ messages, type }) => {
    try {
      let m = messages[0]
      if (!m.message) return

      m.message =
        Object.keys(m.message)[0] === "ephemeralMessage"
          ? m.message.ephemeralMessage.message
          : m.message

      if (m.key && m.key.remoteJid === "status@broadcast") return
      if (!clientt.public && !m.key.fromMe && type === "notify") return
      if (m.key.id?.startsWith("BAE5") && m.key.id.length === 16) return

      m = await smsg(clientt, m)
      await handler(clientt, m, { messages, type })
    } catch (err) {
      console.log(err)
    }
  })

  clientt.ev.on("group-participants.update", async (anu) => {
    await participantsUpdate(clientt, anu)
  })

  clientt.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {}
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid
    } else return jid
  }
}

export function patchSendMessage(client) {
  if (client._sendMessagePatched) return
  client._sendMessagePatched = true

  const original = client.sendMessage.bind(client)
  const queues = new Map()
  client._sendQueues = queues

  client.sendMessage = (jid, content, options = {}) => {
    const queueKey = jid || 'unknown'
    const previous = queues.get(queueKey) || Promise.resolve()

    return new Promise((resolve, reject) => {
      const job = previous
        .catch(() => {})
        .then(async () => {
          let attempt = 0
          while (true) {
            try {
              const res = await original(jid, content, options)
              resolve(res)
              return
            } catch (error) {
              const rateLimited = String(error).includes('rate-overlimit')
              if (!rateLimited || attempt >= 2) {
                reject(error)
                log.error(`Error al enviar mensaje: ${error?.message || error}`)
                return
              }

              attempt++
              log.warn(`Límite de WhatsApp detectado; reintentando (${attempt}/2)…`)
              await new Promise((r) => setTimeout(r, DELAY_AFTER_RATELIMIT))
            }
          }
        })
        .finally(() => {
          if (queues.get(queueKey) === job) queues.delete(queueKey)
        })

      queues.set(queueKey, job)
    })
  }
}

function hasMainSession() {
  const credsPath = path.join(global.sessionName, 'creds.json')
  if (!fs.existsSync(credsPath)) return false
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath))
    return !!creds.registered
  } catch {
    return false
  }
}

function clockString(ms) {
  const d = isNaN(ms) ? '--' : Math.floor(ms / 86400000)
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [d, 'd ️', h, 'h ', m, 'm ', s, 's '].map((v) => v.toString().padStart(2, 0)).join('')
}

function showFatalError(err, title = 'FATAL ERROR') {
  const stack = err?.stack || String(err || 'Unknown error')
  const lines = stack.split('\n').filter(Boolean)

  const firstLine = lines[0] || 'Unknown error'
  const fileLine =
    lines.find(line => line.includes('.js:') || line.includes('.mjs:')) ||
    lines[1] ||
    'No se pudo detectar archivo'

  console.log(
    '\n' +
    chalk.bgRed.white.bold(` ✖  ${title} `) +
    '  ' +
    chalk.redBright(firstLine) +
    '\n' +
    chalk.redBright(fileLine) +
    '\n'
  )
}

;(async () => {
  try {
    global.loadDatabase()
    log.success('Base de datos cargada correctamente.')

    const hasSession = hasMainSession()
    LOGIN_METHOD = hasSession ? null : await uPLoader()

    await startBot()
  } catch (err) {
    showFatalError(err, 'BOOT ERROR')
    process.exit(1)
  }
})()

process.on('uncaughtException', (err) => {
  showFatalError(err, 'UNCAUGHT EXCEPTION')
})

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason))
  showFatalError(err, 'UNHANDLED REJECTION')
})