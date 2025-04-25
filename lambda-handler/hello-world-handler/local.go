// This is a simple AWS Lambda function that returns a JSON response with a message "Hello World"
// Used for integration testing with sam local and docker-compose
package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type Response struct {
	Message string `json:"message"`
}

func init() {
}

func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	response := Response{
		Message: "Hello Wooooorld",
	}

	b, err := json.Marshal(response)
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
