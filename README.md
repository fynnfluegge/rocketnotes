<div align="center">
  <a href="https://www.takeniftynotes.net/">
    <img src="landing-page/src/assets/128x128.png" height="128">
  </a>
  <h1>Rocketnotes</h1>
</div>

## What is Rocketnotes?
Rocketnotes is a Markdown Editor for the Web.

## Setup local dev environment
#### The following needs to be installed on your system prior to start:
- [Docker](https://docs.docker.com/get-docker/)
- [Node.js >= 14.x](https://nodejs.org/download/release/latest-v14.x/)
- [Go 1.x](https://go.dev/doc/install)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

#### 1. Start DynamoDB and docker network
```
docker-compose up -d
```
#### 2. Init tables and create data for default user in DynamoDB Docker container
```
sh ./dynamodb-init.sh
```
#### 3. Build and start Lambda functions with AWS SAM
```
sam build && sam start rocketnotes-serverless-api rocketnotes_serverless-docker-network
```
#### 4. Start Angular App
```
export BASE_API_URL="http://localhost:3000" \
cd webapp && npm install && npm run start
```
---
