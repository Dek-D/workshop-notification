import pika
import os
import firebase_admin
from firebase_admin import messaging
from firebase_admin import credentials
import secret
import json

cred = credentials.Certificate(os.getcwd() + '/'+ secret.credentials)
params = pika.URLParameters(secret.rabbitmqUrl)
connection = pika.BlockingConnection(params)
channel = connection.channel()
channel.queue_declare(queue=secret.queueName, passive=False,
                      durable=False, auto_delete=False)

firebase_admin.initialize_app(cred)

def callback(ch, method, properties, body):
    print('[*] Received: ' + str(body, 'UTF-8'))
    notifcation = json.loads(body.decode('utf-8'))
    sendNotification(notifcation['username'],
                     notifcation['title'],  notifcation['message'])
    if True:
        channel.basic_ack(delivery_tag=method.delivery_tag)


def sendNotification(token,username, title, messages):
    message = messaging.Message(
        notification=messaging.Notification(
            title=username,
            body=title
        ),
        data={
            'username': username,
            'title': title,
            'message': messages
        },
        token=secret.deviceToken,
    )
    response = messaging.send(message)
    print('[*] Successfully sent message: ', response)


channel.basic_consume(queue=secret.queueName,
                      on_message_callback=callback, auto_ack=False)

print('[*] Waiting for messages: ')
channel.start_consuming()
connection.close()
