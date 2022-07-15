import {getAllTask} from "./util";

const debug = require('debug')('line-reminder-bot:task_handler')
import * as line from '@line/bot-sdk'
import * as util from './util'
import dayjs from "dayjs";

let _client: line.Client
let _tasks = new Array<Task>()

export const init = async (client: line.Client, interval: number = 1000) => {
    _client = client

    //  fetch task
    await taskUpdateHandler()
    //  start interval
    setInterval(deadlineHandler, interval)
    setInterval(taskUpdateHandler, 60 * 1000)
}

const deadlineHandler = async () => {
    for (const task of _tasks) {
        if (dayjs(util.getJSTDate()).isAfter(dayjs(task.due_at))) {
            //  push message
            await _client.pushMessage(task.group, {
                type: 'text',
                text: task.contents
            })
            //  remove
            const index = _tasks.indexOf(task)
            _tasks.splice(index, 1)
        }
    }
}

const taskUpdateHandler = async () => {
    _tasks = await getAllTask()
    /*
    let tasks = await getAllTask()
    tasks = tasks.filter(task => {
        return !_tasks.includes(task)
    })

    for (const task of tasks) {
        _tasks.push(task)
    }
    */
}
