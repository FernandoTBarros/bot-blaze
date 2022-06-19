# About bot-blaze
 Telegram Bot created to analyze Blaze signals and look for patterns and send to Telegram chat

It works connecting to Blaze Websocket and collecting the entries
# Install
1. Create a *.env* file copying from *env.template* and put your Telegram Bot Token and Telegram Chat ID to receive the signals.

```.env
# Token of Telegram Bot:
BOT_TELEGRAM_TOKEN=
# Telegram ID of the Chat user of the bot that will receive the signals:
TELEGRAM_CHAT_ID=
```

2. Run `yarn` or `npm install` to download and build the packages

3. Run `yarn dev` or `npm run dev` to start the bot in development mode

# Docker
The project already came with Dockerfile and compose.yaml file to deploy directly to services that support it like [Railway.app](https://railway.app)

# Simulating a STAKE
If you want to change the default Stake parameters you can pass in the *.env* file the BANCA_INICIAL (100) and STAKE (4)

