<p align="center">
  <a href="https://www.takeniftynotes.net/">
    <picture>
      <img src="landing-page/src/assets/128x128.png" height="128">
    </picture>
    <h1 align="center">Rocketnotes</h1>
  </a>
</p>

## What is Rocketnotes?
---
## Getting Started
#### 1. Start DynamoDB with docker and create docker network
```
docker-compose up -d
```
#### 2. Init tables and create data for default user in DynamoDB Docker container
```
sh ./dynamodb-init.sh
```
#### 3. Start Lambda functions with AWS SAM
---
## Contributing Guidelines
---
## lambda-handler
serverless api as lambda-functions

## landing-page
[takeniftynotes.net](https://www.takeniftynotes.net)

## webapp
Angular main app
