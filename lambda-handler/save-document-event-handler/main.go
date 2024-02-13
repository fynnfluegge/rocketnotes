package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/aws/aws-sdk-go/service/sqs"
)

type Item struct {
	Document *Document `json:"detail"`
}

type Document struct {
	ID            string    `json:"id"`
	UserId        string    `json:"userId"`
	Title         string    `json:"title"`
	Content       string    `json:"content"`
	Searchcontent string    `json:"searchContent"`
	LastModified  time.Time `json:"lastModified"`
	IsPublic      bool      `json:"isPublic"`
	OpenAIApiKey  string    `json:"openAIApiKey"`
}

type SqsMessage struct {
	DocumentId   string `json:"documentId"`
	UserId       string `json:"userId"`
	OpenAIApiKey string `json:"openAiApikey"`
}

func init() {
}

func handleRequest(ctx context.Context, event events.SQSEvent) {

	item := Item{}

	json.Unmarshal([]byte(event.Records[0].Body), &item)

	item.Document.Searchcontent = strings.ToLower(item.Document.Title + "\n" + item.Document.Content)

	item.Document.LastModified = time.Now()

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	svc := dynamodb.New(sess)

	av, err := dynamodbattribute.MarshalMap(item.Document)
	if err != nil {
		log.Fatalf("Got error marshalling new movie item: %s", err)
	}

	tableName := "tnn-Documents"

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(input)
	if err != nil {
		log.Fatalf("Got error calling PutItem: %s", err)
	}

	qsvc := sqs.New(sess)

	m := SqsMessage{item.Document.ID, item.Document.UserId, item.Document.OpenAIApiKey}
	b, err := json.Marshal(m)

	_, err = qsvc.SendMessage(&sqs.SendMessageInput{
		DelaySeconds: aws.Int64(0),
		MessageBody:  aws.String(string(b)),
		QueueUrl:     aws.String(os.Getenv("queueUrl")),
	})
	if err != nil {
		log.Fatalf("Error sending sqs message: %s", err)
	}
}

func main() {
	lambda.Start(handleRequest)
}
