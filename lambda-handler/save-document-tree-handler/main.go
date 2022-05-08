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

type Document struct {
	ID       string      `json:"id"`
	Name     string      `json:"name"`
	Parent   string      `json:"parent"`
	Pinned   bool        `json:"pinned"`
	Children []*Document `json:"children"`
}

type Item struct {
	ID        string      `json:"id"`
	Documents []*Document `json:"documents"`
	Trash     []*Document `json:"trash"`
	Pinned    []*Document `json:"pinned"`
}

func init() {
}

func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

	item := Item{}

	json.Unmarshal([]byte(request.Body), &item)

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	svc := dynamodb.New(sess)

	av, err := dynamodbattribute.MarshalMap(item)
	if err != nil {
		log.Fatalf("Got error marshalling new movie item: %s", err)
	}

	tableName := "tnn-Tree"

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(input)
	if err != nil {
		log.Fatalf("Got error calling PutItem: %s", err)
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
	}, nil
}

func main() {
	lambda.Start(handleRequest)
}
