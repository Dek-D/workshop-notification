import amqp from 'amqplib/callback_api'
import { QUEUE_NAME, RABBITMQ_URL } from './secret'
import firebase from 'firebase-admin'

amqp.connect(RABBITMQ_URL, function (error0, connection) {
    connection.createChannel(function (error1, channel) {
        const queue = QUEUE_NAME
        channel.assertQueue(queue)

        console.log(
            '[*] Waiting for messages in %s. To exit press CTRL+C',
            queue
        )
        channel.consume(
            queue,
            function (msg) {
                console.log('[*] Received %s', msg.content.toString())
                sendFcmMessage(JSON.parse(msg.content.toString()))
            },
            {
                noAck: true,
            }
        )
    })
})

const getAccessToken = () => {
    return new Promise(function (resolve, reject) {
        const path = `${process.cwd()}/`
        const key = require(path)
        const jwtClient = new google.auth.JWT(
            key.client_email,
            null,
            key.private_key,
            SCOPES,
            null
        )
        jwtClient.authorize(function (err, tokens) {
            if (err) {
                reject(err)
                return
            }
            resolve(tokens.access_token)
        })
    })
}

const sendFcmMessage = (fcmMessage) => {
    getAccessToken().then(function (accessToken) {
        const options = {
            hostname: HOST,
            path: PATH,
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + accessToken,
            },
        }
        const request = https.request(options, function (resp) {
            resp.setEncoding('utf8')
            resp.on('data', function (data) {
                console.log(
                    '[*] Message sent to Firebase for delivery, response:'
                )
                console.log(data)
            })
        })
        request.on('error', function (err) {
            console.log('Unable to send message to Firebase')
            console.log(err)
        })
        request.write(JSON.stringify(fcmMessage))
        request.end()
    })
}
