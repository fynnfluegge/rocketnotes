package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

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
	searchString := strings.ToLower(request.QueryStringParameters["searchString"])

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	var svc *dynamodb.DynamoDB

	if os.Getenv("USE_LOCAL_DYNAMODB") == "1" {
		svc = dynamodb.New(sess, aws.NewConfig().WithEndpoint("http://dynamodb:8000"))
	} else {
		svc = dynamodb.New(sess)
	}

	tableName := "tnn-Documents"

	expressionAttributeNames := map[string]*string{
		"#content": jsii.String("searchContent"),
	}
	expressionAttributeValues := map[string]*dynamodb.AttributeValue{
		":content": {
			S: aws.String(searchString),
		},
	}
	filterExpression := jsii.String("contains(#content, :content)")

	if os.Getenv("USE_LOCAL_DYNAMODB") != "1" {
		expressionAttributeNames["#userId"] = jsii.String("userId")
		expressionAttributeValues[":userId"] = &dynamodb.AttributeValue{
			S: aws.String(userId),
		}
		filterExpression = jsii.String("#userId = :userId and contains(#content, :content)")
	}

	result, err := svc.Scan(&dynamodb.ScanInput{
		TableName: aws.String(tableName),
		ExpressionAttributeNames: expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
		FilterExpression: filterExpression,
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
		Headers: map[string]string{
			"Access-Control-Allow-Origin": "*", // Required for CORS support to work locally
		},
		Body: string(b),
	}, nil
}

func main() {
	lambda.Start(handleRequest)
}
