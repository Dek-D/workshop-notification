import amqp from 'amqplib/callback_api'
import { QUEUE_NAME, RABBITMQ_URL } from './secret'

amqp.connect(RABBITMQ_URL, function (err, connection) {
    connection.createChannel(function (errCon, channel) {
        const queue = QUEUE_NAME
        const msg = {
            username: '',
            title: '',
            message: '',
        }
        const jsonMessage = JSON.stringify(msg)
        channel.assertQueue(queue, { durable: false })
        channel.sendToQueue(queue, Buffer.from(jsonMessage))
        console.log('[*] Sent %s', msg)
        setTimeout(function () {
            connection.close()
            process.exit(0)
        }, 1000)
    })
})
