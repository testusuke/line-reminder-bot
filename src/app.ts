require('dotenv').config()
const debug = require('debug')('line-remainder-bot:app')
import express from 'express'
import * as line from '@line/bot-sdk'
import logger from 'morgan'
import * as sql from './sql'

//  sql initialize
sql.init()
    //  @ts-ignore
    .then(() => process.emit('ready'))

//  line
const lineConfig: line.Config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};

//  express
export const app = express()
//  logger
app.use(logger('dev'))
// @ts-ignore
app.use("/webhook", line.middleware(lineConfig));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//  health check
app.get("/", (req, res) => {
    res.sendStatus(200);
    debug("came at /")
})

//  listen webhooks
app.post("/webhook", (req, res) => {
    Promise
        .all(req.body.events.map(onEvent))
        .then((result) => res.json(result))
});

//  line client
// @ts-ignore
const client = new line.Client(lineConfig);

//  event handler
const onEvent = (event: line.WebhookEvent) => {
    if (event.type !== 'message' || event.message.type !== 'text' || event.source.type !== "group") {
        return Promise.resolve(null);
    }

    const args = event.message.text.split(' ')
    debug("MESSAGE")
    console.log(event.message.text)
    debug("text: ", event.message.text)

    //  check if message start with mention
    /*
    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: event.message.text
    });
    */
};