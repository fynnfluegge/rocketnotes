# Installation

### Prerequisites

Clone the project:

```
git clone https://github.com/{your-account}/rocketnotes.git
cd rocketnotes
```

## Run with Docker

```
docker-compose up -d
```

Docker-compose will create and start four containers with a docker network:

- the DynamoDB with a volume listening on port 8041
- the S3 mock listening on port 9091
- the Angular app listening on port 3001
- all the lambda functions in a single container listening on port 3002

On initial startup it may take a moment.
Once it's done execute `sh ./dynamodb-init.sh` as a last step to initialize the dynamodb.
Now you can open `http://localhost:3001` in the browser and you should see the initially created Cheat Sheet document 🚀
