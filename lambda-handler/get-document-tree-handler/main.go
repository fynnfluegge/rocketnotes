package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

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

func init() {
}

func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	user := request.PathParameters["userId"]

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	var svc *dynamodb.DynamoDB

	if os.Getenv("USE_LOCAL_DYNAMODB") == "1" {
		svc = dynamodb.New(sess, aws.NewConfig().WithEndpoint("http://dynamodb:8000"))
	} else {
		svc = dynamodb.New(sess)
	}

	tableName := "tnn-Tree"

	result, err := svc.GetItem(&dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(user),
			},
		},
	})
	if err != nil {
		log.Fatalf("Got error calling GetItem: %s", err)
	}

	if result.Item == nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 404,
		}, nil
	}

	item := DocumentTree{}

	err = dynamodbattribute.UnmarshalMap(result.Item, &item)
	if err != nil {
		panic(fmt.Sprintf("Failed to unmarshal Record, %v", err))
	}

	b, err := json.Marshal(item)
	if err != nil {
		fmt.Println(err)
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Access-Control-Allow-Origin": "*", // Required for CORS support to work locally
		},
		Body: string(b),
	}, nil
}

func main() {
	lambda.Start(handleRequest)
}
