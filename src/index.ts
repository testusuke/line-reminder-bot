require('dotenv').config()
process.env.DEBUG = 'line-reminder-bot:*'
const debug = require('debug')('line-reminder-bot:index')
import {app} from './app'
import http from "http";


const port = parseInt(process.env.PORT || '3000', 10);
app.set('port', port)
const server = http.createServer(app)

//  start server
process.once('ready', () => {
    server.listen(port)
    debug('listen at %d', port)
})