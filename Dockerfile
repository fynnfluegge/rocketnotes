# This image is used to run DynamoDB locally with a persistent volume
FROM amazon/dynamodb-local:latest

WORKDIR /home/dynamodblocal

RUN mkdir data