import amqp from 'amqplib/callback_api'
import { QUEUE_NAME, RABBITMQ_URL } from './secret'

amqp.connect(RABBITMQ_URL, function (err, connection) {
    connection.createChannel(function (errCon, channel) {
        const queue = QUEUE_NAME
        const msg = {
            username: 'dekd.niyay',
            title: 'title',
            message: 'Hello from dekd.niyay',
        }
        const jsonMessage = JSON.stringify(msg)
        channel.assertQueue(queue)
        channel.sendToQueue(queue, Buffer.from(jsonMessage))
        console.log('[*] Sent %s', msg)
    })
})
