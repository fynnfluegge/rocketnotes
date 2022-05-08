package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

type Item struct {
	Document *Document `json:"detail"`
}

type Document struct {
	ID           string `json:"ID"`
	ParentId     string `json:"parentId"`
	UserId       string `json:"userId"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	LastModified string `json:"lastModified"`
}

func init() {
}

func handleRequest(ctx context.Context, event events.SQSEvent) {

	item := Item{}

	json.Unmarshal([]byte(event.Records[0].Body), &item)

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	svc := dynamodb.New(sess)

	av, err := dynamodbattribute.MarshalMap(item.Document)
	if err != nil {
		log.Fatalf("Got error marshalling new movie item: %s", err)
	}

	tableName := "tnn-documents"

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(input)
	if err != nil {
		log.Fatalf("Got error calling PutItem: %s", err)
	}
}

func main() {
	lambda.Start(handleRequest)
}
