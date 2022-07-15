import * as sql from './sql'
import {formatToTimeZone} from 'date-fns-timezone'
import * as util from "util";

export const prepareTask = async (task: Task): Promise<Task> => {
    const date = getJSTDate()
    const id = await sql.findOne(
        'INSERT INTO `tasks` (`contents`, `group`, `user`, `created_at`) VALUES (?, ?, ?, ?)',
        task.contents,
        task.group,
        task.user,
        date
    ) as number

    return {
        ...task,
        id: id,
        created_at: date
    }
}

export const confirmTask = async (id: number, date: string): Promise<boolean> => {
    //  check if task exist
    const task = sql.findOne(
        'SELECT * FROM `tasks` WHERE `id`=?',
        id
    )
    if (!task) {
        return false
    }

    //  update
    await sql.execute(
        'UPDATE `tasks` SET `due_at`=? WHERE `id`=?',
        formatDateFromLINE(date),
        id
    )
    return true
}

export const getAllTask = async (groupId?: string, limit: number = 50): Promise<Array<Task>> => {
    let tasks = []

    let result
    if (!groupId) {
        result = await sql.query(
            'SELECT * FROM `tasks` WHERE `due_at`>=?',
            getJSTDate()
        )
    } else {
        result = await sql.query(
            'SELECT * FROM `tasks` WHERE `group`=? AND `due_at`>=?',
            groupId,
            getJSTDate()
        )
    }

    for (const r of result.results) {
        const task: Task = {
            id: r.id,
            contents: r.contents,
            group: r.group,
            user: r.user,
            due_at: r.due_at,
            created_at: r.created_at
        }
        tasks.push(task)
    }
    return tasks
}

export const getTask = async (id: number, due:boolean = true): Promise<Task | undefined> => {

    let r
    if (due) {
        r = await sql.findOne(
            'SELECT * FROM `tasks` WHERE `id`=? AND `due_at`>=?',
            id,
            getJSTDate()
        )
    } else {
        r = await sql.findOne(
            'SELECT * FROM `tasks` WHERE `id`=?',
            id
        )
    }

    if (!r) return undefined

    return {
        id: r.id,
        contents: r.contents,
        group: r.group,
        user: r.user,
        due_at: r.due_at,
        created_at: r.created_at
    }
}

export const removeTask = async (id: number): Promise<void> => {
    await sql.execute(
        'DELETE FROM `tasks` WHERE `id`=?',
        id
    )
}

export const getJSTDate = (): string => {
    const FORMAT = 'YYYY-MM-DD HH:mm:ss';
    const TIME_ZONE_TOKYO = 'Asia/Tokyo';
    return formatToTimeZone(new Date(), FORMAT, {timeZone: TIME_ZONE_TOKYO})
}

export const getJSTLineDate = (): string => {
    const FORMAT = 'YYYY-MM-DDtHH:mm';
    const TIME_ZONE_TOKYO = 'Asia/Tokyo';
    return formatToTimeZone(new Date(), FORMAT, {timeZone: TIME_ZONE_TOKYO})
}

export const formatDateFromLINE = (date: string): string => {
    return date.replace('T', ' ') + ":00"
}