require('dotenv').config()
const debug = require('debug')('line-reminder-bot:app')
import express from 'express'
import * as line from '@line/bot-sdk'
import logger from 'morgan'
import * as sql from './sql'
import * as util from './util'
import * as taskHandler from './task_handler'
import * as queryString from 'query-string'

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
app.use(express.urlencoded({extended: true}))

//  health check
app.get("/", (req, res) => {
    res.sendStatus(200);
})

//  listen webhooks
app.post("/webhook", (req, res) => {
    Promise
        .all(req.body.events.map(onEvent))
        .then((result) => res.json(result))
});

//  line client
// @ts-ignore
const client = new line.Client(lineConfig)
const prefix = process.env.PREFIX || "remainder"
taskHandler.init(client).then(() => debug("handler launched"))

//  event handler
const onEvent = async (event: line.WebhookEvent) => {
    // debug(event)

    //  MessageEvent
    if (event.type === 'message' && event.message.type === 'text' && event.source.type === "group") {
        const args = event.message.text.split(' ')
        //  prefix
        if (args[0] !== prefix) {
            return Promise.resolve(null);
        }

        switch (args[1]) {

            case 'help': {
                const pj = require('../package.json')
                const msg = "使い方\n" +
                    prefix + " help -> ヘルプ\n" +
                    prefix + " list -> タスク一覧\n" +
                    prefix + " <content> -> タスクを登録\n" +
                    "追加して欲しい機能があれば気軽に声をかけてください\n" +
                    "version: " + pj.version    // + "\n" +
                //"github: " + pj.repository
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: msg
                }, true)
            }
            case 'list': {
                const groupId = event.source.groupId
                const tasks = await util.getAllTask(groupId, 10)
                //  size check
                if (tasks.length < 1) {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: "残っているタスクはありません"
                    }, true)
                }

                const columns: line.TemplateColumn[] = []
                for (const task of tasks) {
                    const col: line.TemplateColumn = {
                        text: task.contents.substring(0, 45) + "\n日時: " + task.due_at,
                        actions: [
                            //  reset datetime
                            {
                                type: "datetimepicker",
                                label: "日時変更",
                                data: "action=set-date&taskId=" + task.id,
                                mode: "datetime",
                                initial: util.getJSTLineDate(),
                                max: "2100-12-31T23:59",
                                min: util.getJSTLineDate()
                            },
                            //  remove task
                            {
                                type: "postback",
                                label: "タスク削除",
                                data: "action=remove-task&taskId=" + task.id
                            }
                        ]
                    }
                    columns.push(col)
                }

                //  push
                return client.replyMessage(event.replyToken, {
                    type: "template",
                    altText: "モバイルアプリからのみ閲覧・操作できるアクションです。",
                    template: {
                        type: "carousel",
                        columns: columns
                    }
                }, true)
            }

            default: {
                const contents = event.message.text.slice(prefix.length)
                if (contents.length < 2 || contents.length > 500) {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: "1~500文字の範囲で作成してください"
                    }, true)
                }
                //  pre-task
                let userId = event.source.userId
                if (!userId) {
                    userId = ""
                }
                const task = await util.prepareTask({
                    id: 0,
                    contents: contents,
                    group: event.source.groupId,
                    user: userId,
                    due_at: "",
                    created_at: ""
                })

                //  post datetime action
                return client.replyMessage(event.replyToken, {
                    type: "template",
                    altText: "日時を指定してください。モバイルアプリからのみ操作できるアクションです。",
                    template: {
                        type: "confirm",
                        text: "日時を指定してください",
                        actions: [
                            {
                                type: "datetimepicker",
                                label: "日時指定",
                                data: "action=set-date&taskId=" + task.id,
                                mode: "datetime",
                                initial: util.getJSTLineDate(),
                                max: "2100-12-31T23:59",
                                min: util.getJSTLineDate()
                            },
                            //  remove task
                            {
                                type: "postback",
                                label: "キャンセル",
                                data: "action=remove-task&taskId=" + task.id
                            }
                        ]
                    }
                }, true)
            }
        }
    }

    //  onPostBack
    if (event.type === 'postback') {
        const obj = queryString.parse(event.postback.data)

        switch (obj.action) {
            case 'set-date': {
                const id = obj.taskId
                //  @ts-ignore
                const date = event.postback.params.datetime
                if (!id || !date || !event.source.userId) {
                    return Promise.resolve(null)
                }

                const task = await util.getTask(+id)
                if (!task) {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: "対象のタスクがありません"
                    }, true)
                }

                const result = await util.confirmTask(+id, date)
                const userProfile = await client.getProfile(event.source.userId)
                if (result) {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: userProfile.displayName + "さんが、日時を" +  date + "に設定しました"
                    }, true)
                } else {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: "すでに終了したタスクもしくは、エラーが発生しました"
                    }, true)
                }
            }
            case 'remove-task': {
                const id = obj.taskId
                if (!id || !event.source.userId) return Promise.resolve(null)

                const task = await util.getTask(+id)
                const userProfile = await client.getProfile(event.source.userId)
                if (!task) {
                    return client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: "対象のタスクがありません"
                    }, true)
                }
                await util.removeTask(+id)
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: userProfile.displayName + "さんが、タスクを削除しました"
                }, true)
            }
            default:
                return Promise.resolve(null)
        }
    }

}