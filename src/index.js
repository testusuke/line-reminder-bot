const express = require("express");
const line = require("@line/bot-sdk");
const mysql = require("mysql");

//  line
const lineConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};

const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS
});

//  app
const expressPort = 3000;
const app = express();
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

//  health check
app.get("/", (req, res) => {
    res.sendStatus(200)
})

//  listen webhooks
app.post("/webhook", line.middleware(lineConfig), (req, res) => {
   Promise
       .all(req.body.events.map(handleEvent))
       .then((result) => res.json(result));
});

//  line client
const client = new line.Client(lineConfig);

//  event handler
const handleEvent = (event) => {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    console.log(event.message.text);

    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: event.message.text
    });
};

//  express start
app.listen(expressPort);
