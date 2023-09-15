import pika
import secret
import json


notification = {
    'username': '',
    'title': '',
    'message': '',
    'deviceToken': secret.deviceToken
}

notification = json.dumps(notification)

params = pika.URLParameters(secret.rabbitmqUrl)
connection = pika.BlockingConnection(params)
channel = connection.channel()

channel.queue_declare(queue=secret.queueName, passive=False,
                      durable=False, auto_delete=False)

channel.basic_publish(
    exchange='', routing_key=secret.queueName, body=notification)
print('[*] Sent: ' + notification)
connection.close()
