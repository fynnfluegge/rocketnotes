package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

type Zettel struct {
  ID       string `json:"id"`
  UserId   string `json:"userId"`
  Content  string `json:"content"`
  Created  string `json:"created"`
}

func init() {
}

func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

	id := request.PathParameters["id"]

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	var svc *dynamodb.DynamoDB

	if os.Getenv("USE_LOCAL_DYNAMODB") == "1" {
		svc = dynamodb.New(sess, aws.NewConfig().WithEndpoint("http://dynamodb:8000"))
	} else {
		svc = dynamodb.New(sess)
	}

	tableName := "tnn-Zettelkasten"

	result, err := svc.GetItem(&dynamodb.DeleteItemInput{
		TableName: aws.String(tableName),
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(id),
			},
		},
	})
	if err != nil {
		log.Fatalf("Got error calling DeleteItem: %s", err)
	}

	if result.Item == nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 404,
		}, nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Access-Control-Allow-Origin": "*", // Required for CORS support to work locally
		},
	}, nil
}

func main() {
	lambda.Start(handleRequest)
}
