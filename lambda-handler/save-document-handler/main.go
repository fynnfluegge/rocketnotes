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
	Body *Body `json:"detail"`
}

type Body struct {
	Document     *Document     `json:"document"`
	DocumentTree *DocumentTree `json:"documentTree"`
}

type Document struct {
	ID            string    `json:"id"`
	ParentId      string    `json:"parentId"`
	UserId        string    `json:"userId"`
	Title         string    `json:"title"`
	Content       string    `json:"content"`
	Searchcontent string    `json:"searchContent"`
	LastModified  time.Time `json:"lastModified"`
	Deleted       bool      `json:"deleted"`
	IsPublic      bool      `json:"isPublic"`
}

type DocumentTreeItem struct {
	ID           string              `json:"id"`
	Name         string              `json:"name"`
	Parent       string              `json:"parent"`
	Pinned       bool                `json:"pinned"`
	LastModified time.Time           `json:"lastModified"`
	Children     []*DocumentTreeItem `json:"children"`
}

type DocumentTree struct {
	ID        string              `json:"id"`
	Documents []*DocumentTreeItem `json:"documents"`
	Trash     []*DocumentTreeItem `json:"trash"`
	Pinned    []*DocumentTreeItem `json:"pinned"`
}

type SqsMessage struct {
	UserId     string `json:"userId"`
	DocumentId string `json:"documentId"`
}

func init() {
}

func handleRequest(ctx context.Context, event events.SQSEvent) {
	item := Item{}

	json.Unmarshal([]byte(event.Records[0].Body), &item)

	item.Body.Document.Searchcontent = strings.ToLower(item.Body.Document.Title + "\n" + item.Body.Document.Content)

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	svc := dynamodb.New(sess)

	av, err := dynamodbattribute.MarshalMap(item.Body.Document)
	if err != nil {
		log.Fatalf("Got error marshalling new document item: %s", err)
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

	av, err = dynamodbattribute.MarshalMap(item.Body.DocumentTree)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 404,
		}, nil
	}

	tableName = "tnn-Tree"

	input = &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(input)
	if err != nil {
		log.Fatalf("Got error calling PutItem: %s", err)
	}

	user_config, err := svc.GetItem(&dynamodb.GetItemInput{
		TableName: aws.String("tnn-UserConfig"),
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(item.Body.Document.UserId),
			},
		},
	})
	if err != nil {
		log.Fatalf("Got error calling GetItem: %s", err)
	}

	if user_config.Item != nil {
		log.Printf("Recreating index for document %s", item.Body.Document.ID)
		qsvc := sqs.New(sess)

		m := SqsMessage{item.Body.Document.UserId, item.Body.Document.ID}
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
}

func main() {
	lambda.Start(handleRequest)
}
