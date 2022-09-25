package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/aws/jsii-runtime-go"
)

type Document struct {
	ID           string `json:"id"`
	ParentId     string `json:"parentId"`
	UserId       string `json:"userId"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	LastModified string `json:"lastModified"`
	Deleted      bool   `json:"deleted"`
}

func init() {
}

func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

	userId := request.PathParameters["userId"]
	searchString := request.QueryStringParameters["searchString"]

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	svc := dynamodb.New(sess)

	tableName := "tnn-Documents"

	result, err := svc.Scan(&dynamodb.ScanInput{
		TableName: aws.String(tableName),
		ExpressionAttributeNames: map[string]*string{
			"#userId":  jsii.String("userId"),
			"#content": jsii.String("content"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":userId": {
				S: aws.String(userId),
			},
			":content": {
				S: aws.String(searchString),
			},
		},
		FilterExpression: jsii.String("(#userId = :userId) and contains(#content, :content)"),
	})

	if err != nil {
		log.Fatalf("Got error calling GetItem: %s", err)
	}

	item := []Document{}

	err = dynamodbattribute.UnmarshalListOfMaps(result.Items, &item)
	if err != nil {
		panic(fmt.Sprintf("Failed to unmarshal Record, %v", err))
	}

	b, err := json.Marshal(item)
	if err != nil {
		fmt.Println(err)
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(b),
	}, nil
}

func main() {
	lambda.Start(handleRequest)
}
