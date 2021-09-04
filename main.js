process.env.NTBA_FIX_319 = 1

// config
const config = require('./config.json')
const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  CRON_EXPRESSION,
  ETHEREUM_GAS_API_WITH_API_KEY,
  GAS_PRICE_BASE,
} = config

// cronjob
const CronJob = require('cron').CronJob

// telegram bot
const TelegramBot = require('node-telegram-bot-api')
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

// node-fetch
const fetch = require('node-fetch')

// telgram bot listener
bot.on('message', (msg) => {
  const chatId = msg.chat.id

  if (msg.text === 'gas') {
    fetch(ETHEREUM_GAS_API_WITH_API_KEY)
      .then((res) => res.json())
      .then(
        (response) => {
          const { message, result } = response || {}
          const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = result || {}
          if (message === 'OK')
            bot.sendMessage(
              chatId,
              `Current Ethereum Gas: ${SafeGasPrice}, ${ProposeGasPrice}, ${FastGasPrice}`
            )
        },
        (error) => console.log('fetch api error', error)
      )
  }
})

// 每半小時最多推一次
let lastSentAt = Date.now() - 31 * 60 * 1000

const crawler = () => {
  fetch(ETHEREUM_GAS_API_WITH_API_KEY)
    .then((res) => res.json())
    .then(
      (result) => {
        if (result?.message === 'OK') {
          const safeGasPrice = Number(result?.result?.SafeGasPrice)
          const now = Date.now()

          if (safeGasPrice < GAS_PRICE_BASE && lastSentAt < now - 30 * 60 * 1000) {
            lastSentAt = now
            bot.sendMessage(TELEGRAM_CHAT_ID, `Current Safe Gas Price: ${safeGasPrice}`)
          }
        }
      },
      (error) => console.log('fetch api error', error)
    )
}

const job = new CronJob(CRON_EXPRESSION, () => crawler())
console.log(`CronJob Start -> ${CRON_EXPRESSION}`)
job.start()
