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

type RequestBody struct {
	Id    string `json:"userId"`
	TextCompletionModel string `json:"textCompletionModel"`
	EmbeddingsModel string `json:"embeddingsModel"`
	LlModel string `json:"llModel"`
	OpenAiApiKey string `json:"openAiApiKey"`
	AnthropicApiKey string `json:"anthropicApiKey"`
}

type SqsMessage struct {
  UserId string `json:"userId"`
  OpenAiApiKey string `json:"openAiApiKey"`
  AnthropicApiKey string `json:"anthropicApiKey"`
  RecreateIndex bool `json:"recreateIndex"`
}


func init() {
}

func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

	item := Item{}

	json.Unmarshal([]byte(request.Body), &item)

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	var svc *dynamodb.DynamoDB

	if os.Getenv("USE_LOCAL_DYNAMODB") == "1" {
		svc = dynamodb.New(sess, aws.NewConfig().WithEndpoint("http://dynamodb:8000"))
	} else {
		svc = dynamodb.New(sess)
	}

	tableName := "tnn-UserConfig"

	av, err := dynamodbattribute.MarshalMap(item)
	if err != nil {
		log.Fatalf("Got error marshalling new document item: %s", err)
	}

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(input)
	if err != nil {
		log.Fatalf("Got error calling PutItem: %s", err)
	}


	qsvc := sqs.New(sess)

	m := SqsMessage{item.Id, item.OpenAiApiKey, item.AnthropicApiKey, true}
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
