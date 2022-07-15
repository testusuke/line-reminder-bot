const debug = require('debug')('line-remainder-bot:sql')
import mysql from 'mysql'

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE
})

export const getConnection = (): Promise<mysql.Connection> => {
    return new Promise((resolve, rejects) => {
        pool.getConnection((err, connection) => {
            if (err) {
                debug(err)
                return rejects(err)
            }
            resolve(connection)
        })
    })
}

export const queryWithConnection = (connection: mysql.Connection, sql: string, ...values: Array<any>): Promise<{ results: Array<any>, fields: mysql.FieldInfo[] | undefined }> => {
    return new Promise((resolve, reject) => {
        debug(sql, values)
        connection.query(sql, values, (error, results, fields) => {
            if (error) {
                debug(error)
                return reject(error)
            }
            resolve({results, fields})
        })
    })
}

export const execute = (sql: string, ...values: Array<any>): Promise<void> => {
    return new Promise((resolve, reject) => {
        debug(sql, values)
        pool.query(sql, values, (error) => {
            if (error) {
                debug(error)
                return reject(error)
            }
            resolve()
        })
    })
}

export const query = (sql: string, ...values: Array<any>): Promise<{ results: Array<any>, fields: mysql.FieldInfo[] | undefined }> => {
    return new Promise((resolve, reject) => {
        debug(sql, values)
        pool.query(sql, values, (error, results, fields) => {
            if (error) {
                debug(error)
                return reject(error)
            }
            resolve({results, fields})
        })
    })
}

export const findOne = async (sql: string, ...values: Array<any>): Promise<any> => {
    if (!sql.toLowerCase().startsWith('insert')) return await query(sql, ...values).then(value => value.results[0] || null)
    const connection = await getConnection()
    await queryWithConnection(connection, sql, ...values)
    return await queryWithConnection(connection, "SELECT LAST_INSERT_ID() AS why").then(value => value.results[0] ? value.results[0]['why'] : null)
}

export const init = async () => {
    debug("sql initializer")

    await findOne('SHOW TABLES LIKE "tasks"').then(async (result) => {
        if (!result) {
            debug('Creating tasks table')
            await execute(
                `create table tasks
                 (
                     \`id\`         int auto_increment,
                     \`contents\`   text         not null,
                     \`group\`      varchar(255) not null,
                     \`user\`       varchar(64)  not null,
                     \`due_at\`     DATETIME null,
                     \`created_at\` DATETIME     not null,
                     constraint tasks_pk
                         primary key (\`id\`)
                 )`
            )
            debug('Created tasks table')
        }
    })
}

