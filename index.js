require('dotenv').config()
const axios = require('axios')
const Groq = require('groq-sdk')
const TelegramBot = require('node-telegram-bot-api')

const model = process.env.GROQ_MODEL
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })

const main = async () => {
  try {
    console.log('Listening messages')

    const chats = {}

    bot.on('message', async msg => {
      const chatId = msg.chat.id

      let fileContent = ''
      if (msg.document) {
        const fileId = msg.document.file_id

        const file = await bot.getFile(fileId)
        const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`

        const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' })
        const buffer = Buffer.from(response.data, 'binary')

        fileContent = buffer.toString('utf8')
      }

      if (msg.text === '/start') {
        await bot.sendMessage(chatId, `Hey, ${msg.from.first_name}.`)
        await bot.sendMessage(chatId, 'Just send me a file and I will provide a summary of the content.')
        return
      }

      if (!chats[chatId]) {
        chats[chatId] = []
        chats[chatId].push({ role: 'system', content: 'You are a bot designed to summarize given file content.' })
      }

      const messageWithFileContent = fileContent
        ? `${msg.caption} ${fileContent}`
        : msg.text
      chats[chatId].push({ role: 'user', content: messageWithFileContent })

      const chatCompletion = await groq.chat.completions.create({ model, messages: chats[chatId] })
      const lastMessage = chatCompletion.choices[0]?.message?.content || ''

      bot.sendMessage(chatId, lastMessage)
    })
  } catch (err) {
    console.log(err.message)
  }
}

main()
