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

type Zettel struct {
	ID      string    `json:"id"`
	UserId  string    `json:"userId"`
	Content string    `json:"content"`
	Created time.Time `json:"created"`
}

func init() {
}

func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	id := request.PathParameters["userId"]

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

	result, err := svc.Query(&dynamodb.QueryInput{
		TableName: aws.String(tableName),
		IndexName: aws.String("userId-index"),
		KeyConditions: map[string]*dynamodb.Condition{
			"userId": {
				ComparisonOperator: aws.String("EQ"),
				AttributeValueList: []*dynamodb.AttributeValue{
					{
						S: aws.String(id),
					},
				},
			},
		},
	})
	if err != nil {
		log.Fatalf("Got error calling GetItem: %s", err)
	}

	items := []Zettel{}
	for _, i := range result.Items {
		item := Zettel{}
		err = dynamodbattribute.UnmarshalMap(i, &item)
		if err != nil {
			fmt.Println("Error unmarshalling item:", err)
		}
		items = append(items, item)
	}

	b, err := json.Marshal(items)
	if err != nil {
		fmt.Println(err)
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			// TODO - change this to the actual allowed origins
			"Access-Control-Allow-Origin": "*", // Required for CORS support to work locally
		},
		Body: string(b),
	}, nil
}

func main() {
	lambda.Start(handleRequest)
}
