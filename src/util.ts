import * as sql from './sql'
import exp from "constants";

export const prepareTask = async (task: Task): Promise<Task> => {
    const date = new Date().toISOString()
    const id = await sql.findOne(
        'INSERT INTO `tasks` (`content`, `group`, `user`, `created_at`) VALUES (?, ?, ?, ?)',
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
        'SELECT FROM `tasks` WHERE `id`=?',
        id
    )
    if (!task) {
        return false
    }

    //  update
    const formattedDate = new Date(date).toISOString()
    await sql.execute(
        'UPDATE `tasks` SET `due_at`=? WHERE `id`=?',
        formattedDate,
        id
    )
    return true
}

export const removeTask = async (id: number): Promise<void> => {

}