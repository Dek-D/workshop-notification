package main

import (
	"context"
	"encoding/json"
	"log"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	amqp "github.com/rabbitmq/amqp091-go"

	"google.golang.org/api/option"
)

var rabbitmqURL = ""
var queueName = ""
var credential = ""

type Message struct {
	Title       string `json:"title"`
	Message     string `json:"message"`
	Username    string `json:"username"`
	DeviceToken string `json:"deviceToken"`
}

var client *messaging.Client
var ctx = context.Background()
var message *Message

func init() {
	opt := option.WithCredentialsFile(credential)
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		failOnError(err, "error initializing firebase app")
	}

	client, err = app.Messaging(ctx)
	if err != nil {
		log.Fatalf("error getting Messaging client: %v\n", err)
	}
}

func main() {
	conn, err := amqp.Dial(rabbitmqURL)
	failOnError(err, "Failed to connect to RabbitMQ")
	defer conn.Close()

	ch, err := conn.Channel()
	failOnError(err, "Failed to open a channel")
	defer ch.Close()

	q, err := ch.QueueDeclare(
		queueName, // name
		false,     // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		nil,       // arguments
	)
	failOnError(err, "Failed to declare a queue")

	msgs, err := ch.Consume(
		q.Name, // queue
		"",     // consumer
		true,   // auto-ack
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	)
	failOnError(err, "Failed to register a consumer")

	var forever chan struct{}
	go func() {
		for d := range msgs {
			log.Printf("Received a message: %s", d.Body)

			err = json.Unmarshal(d.Body, &message)
			if err != nil {
				failOnError(err, "Failed to unmarshal message: %v\n")
			}

			client.Send(ctx, &messaging.Message{
				Token: message.DeviceToken,
				Data: map[string]string{
					"title":    message.Title,
					"username": message.Username,
					"message":  message.Message,
				},
				Notification: &messaging.Notification{
					Title: message.Username,
					Body:  message.Title,
				},
			})
		}
	}()

	log.Printf(" [*] Waiting for messages. To exit press CTRL+C")
	<-forever
}

func failOnError(err error, msg string) {
	if err != nil {
		log.Panicf("%s: %s", msg, err)
	}
}
