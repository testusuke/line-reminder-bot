const express = require("express");
const line = require("@line/bot-sdk");

const expressPort = process.env.EXPRESS_PORT;
//  config
const lineConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};

//  app
const app = express();
//  listen webhooks
app.post("/webhook", line.middleware(lineConfig), (req, res) => {
   Promise
       .all(req.body.events.map(handleEvent))
       .then((result) => res.json(result));
});

//  line client
const client = new line.Client(lineConfig);
//  event handler
function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: event.message.text
    });
}

const test = () => {
    console.log("hello");
};

setInterval(test, 1000);

//  express start
app.listen(expressPort);
