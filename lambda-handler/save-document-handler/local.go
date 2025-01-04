package main

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

type Body struct {
	Document     *Document     `json:"document"`
	DocumentTree *DocumentTree `json:"documentTree"`
	OpenAiApiKey string        `json:"openAiApiKey"`
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

func init() {
}

func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	item := Body{}

	json.Unmarshal([]byte(request.Body), &item)

	item.Document.Searchcontent = strings.ToLower(item.Document.Title + "\n" + item.Document.Content)

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	var svc *dynamodb.DynamoDB

	svc = dynamodb.New(sess, aws.NewConfig().WithEndpoint("http://dynamodb:8000"))

	av, err := dynamodbattribute.MarshalMap(item.Document)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 404,
		}, nil
	}

	tableName := "tnn-Documents"

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(input)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 404,
		}, nil
	}

	av, err = dynamodbattribute.MarshalMap(item.DocumentTree)
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
