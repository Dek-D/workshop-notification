import amqp from 'amqplib/callback_api'
import { QUEUE_NAME, RABBITMQ_URL, PROJECT_ID, DEVICE_TOKEN } from './secret'
import key from './workshop-dekd.json' assert { type: 'json' }
import google from 'googleapis'
import https from 'https'

const HOST = 'fcm.googleapis.com'
const MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const SCOPES = [MESSAGING_SCOPE]
const PATH = '/v1/projects/' + PROJECT_ID + '/messages:send'

amqp.connect(RABBITMQ_URL, function (_, connection) {
    connection.createChannel(function (_, channel) {
        const queue = QUEUE_NAME
        channel.assertQueue(queue, { durable: false })

        console.log(
            '[*] Waiting for messages in %s. To exit press CTRL+C',
            queue
        )
        channel.consume(
            queue,
            function (msg) {
                console.log('[*] Received %s', msg.content.toString())
                const content = JSON.parse(msg.content.toString())
                sendFcmMessage({
                    message: {
                        token: DEVICE_TOKEN,
                        notification: {
                            title: content?.username,
                            body: content?.title,
                        },
                        data: content,
                    },
                })
            },
            {
                noAck: true,
            }
        )
    })
})

const getAccessToken = () => {
    return new Promise(function (resolve, reject) {
        const jwtClient = new google.Auth.JWT(
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
