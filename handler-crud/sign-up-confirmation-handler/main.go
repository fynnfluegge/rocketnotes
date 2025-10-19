package main

import (
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/google/uuid"
)

type Document struct {
	ID           string    `json:"id"`
	UserId       string    `json:"userId"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	LastModified time.Time `json:"lastModified"`
}

type DocumentNode struct {
	ID       string          `json:"id"`
	Name     string          `json:"name"`
	Parent   string          `json:"parent"`
	Pinned   bool            `json:"pinned"`
	Children []*DocumentNode `json:"children"`
}

type Item struct {
	ID        string          `json:"id"`
	Documents []*DocumentNode `json:"documents"`
	Trash     []*DocumentNode `json:"trash"`
	Pinned    []*DocumentNode `json:"pinned"`
}

func handler(event events.CognitoEventUserPoolsPostConfirmation) (events.CognitoEventUserPoolsPostConfirmation, error) {
	fmt.Printf("PostConfirmation for user: %s\n", event.UserName)

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	svc := dynamodb.New(sess)

	welcomeDocumentId := "5b6ae09e-c32a-45ee-bb3b-1c65fc943a9c"

	// get cheat sheet template from db

	tableName := "tnn-Documents"

	result, err := svc.GetItem(&dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(welcomeDocumentId),
			},
		},
	})
	if err != nil {
		log.Fatalf("Got error calling GetItem: %s", err)
	}

	cheatSheet := Document{}

	err = dynamodbattribute.UnmarshalMap(result.Item, &cheatSheet)
	if err != nil {
		panic(fmt.Sprintf("Failed to unmarshal Record, %v", err))
	}

	// pute new cheat sheet to db

	cheatSheet.ID = uuid.NewString()
	cheatSheet.UserId = event.UserName
	cheatSheet.LastModified = time.Now()

	av, err := dynamodbattribute.MarshalMap(cheatSheet)
	if err != nil {
		log.Fatalf("Got error marshalling new movie item: %s", err)
	}

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(input)
	if err != nil {
		log.Fatalf("Got error calling PutItem: %s", err)
	}

	// put document tree to db

	tableName = "tnn-Tree"

	item := Item{
		ID: event.UserName,
		Documents: []*DocumentNode{
			{
				ID:       cheatSheet.ID,
				Name:     cheatSheet.Title,
				Parent:   "root",
				Pinned:   false,
				Children: nil,
			},
		},
		Trash:  nil,
		Pinned: nil,
	}

	av, err = dynamodbattribute.MarshalMap(item)
	if err != nil {
		log.Fatalf("Got error marshalling new movie item: %s", err)
	}

	input = &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(input)
	if err != nil {
		log.Fatalf("Got error calling PutItem: %s", err)
	}

	return event, nil
}

func main() {
	lambda.Start(handler)
}
