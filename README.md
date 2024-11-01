<div align="center">
  <a href="https://www.takeniftynotes.net/">
    <img src="landing-page/src/assets/128x128.png" height="128">
  </a>
  
  # Rocketnotes
  
  [![Build](https://github.com/fynnfluegge/rocketnotes/actions/workflows/build.yml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/build.yml)
  [![Deploy](https://github.com/fynnfluegge/rocketnotes/actions/workflows/deploy.yml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/deploy.yml)
  [![License](https://img.shields.io/badge/License-MIT%20-green.svg)](https://opensource.org/licenses/MIT)

</div>

Rocketnotes is a web-based Markdown note taking app with LLM-powered text completion, chat and semantic search.  
It utilizes a [100% Serverless RAG pipeline](https://medium.com/@fynnfluegge/serverless-rag-on-aws-bf8029f8bffd) built with
[langchain](https://github.com/langchain-ai/langchain),
[sentence-transformers](https://github.com/UKPLab/sentence-transformers),
[faiss](https://github.com/facebookresearch/faiss),
[Ollama](https://github.com/jmorganca/ollama) and OpenAI or Anthropic.  

## How to use

- [Sign Up](https://takeniftynotes.auth.eu-central-1.amazoncognito.com/login?response_type=code&client_id=tt3v27pnqqh7elqdvq9tgmr9v&redirect_uri=https://app.takeniftynotes.net) for free
- Run it 100% [locally with Docker](#run-with-docker)
- Host in your personal [AWS](#aws-hosting) account

## ✨ Features

- 📝 Code syntax highlighting
- 📊 Katex and Mermaid support
- 🌳 Hierarchical document tree with draggable nodes
- 🌐 Document sharing
- 🔍 Content search
- 🔦 Semantic search
- ✍️ Copilot-like text completion
- 🤖 Chat with your documents
  - Serverless RAG with faiss, OpenAI and/or Anthropic
- 📦 Local mode with Docker
  - use Ollama and/or Sentence Transformers for 100% local RAG
- 📥 Zettelkasten with semantic archiving
  - Use vector index to insert notes into highest semantic-ranked documents
    &nbsp;

<div align="center">
  
![rocketnotes_theme](https://github.com/fynnfluegge/rocketnotes/assets/16321871/6f5cf350-4560-4262-896e-44bd059b2f93)

</div>

## Chat with your documents or do semantic search

- 🤖 Use the power of LLMs together with vector embeddings to chat with your notes or search them semantically.
<div align="center">
  <img src="https://github.com/fynnfluegge/rocketnotes/assets/16321871/6bb831ff-e7f2-41ab-824b-609fbb62853b" width="800">
</div>

## LLM-powered text completion

- 🤖 Get Copilot-like text completion autosuggestions.
<div align="center">
  <img src="https://github.com/fynnfluegge/rocketnotes/assets/16321871/648ae135-0406-4854-a68f-fb6b3d3f0702" width="800">
</div>

## Zettelkasten with semantic archiving

- ✍️ Save your daily note snippets into zettelkasten.
- 📥 Use vector index to insert notes into highest semantic-ranked documents with ease.
<div align="center">
  <img src="https://github.com/user-attachments/assets/9fe9d1b3-8e7e-4d45-90c2-b7bd4f03b23f" width="800">
</div>

&nbsp;

## Create code snippets with syntax highlighting

- 📝 Use the power and simplicity of Markdown for your personal notes.
- 💻 Create useful code snippets in your favourite programming language with syntax highlighting.
- 📖 Share documents with external users.
<div align="center">
  <img src="landing-page/src/assets/code_editor.gif">
</div>

&nbsp;

## Superfast Document Search

- 🔎 Search through all your documents by content.
- 🚀 Get an autosuggestion panel with all documents matching you search pattern - superfast!
<div align="center">
  <img src="https://github.com/fynnfluegge/rocketnotes/assets/16321871/0d1582fa-120f-4cc5-89c2-a490cc1a750a" width="800">
</div>

&nbsp;

## Hierarchical Document Tree

- 📚 Save your note documents hierarchical with unlimited depth of subdocuments.
- 🗂️ Structure your notes by simply drag and drop the desired document.
- 🌟 Pin favourite documents for fast top-level access.
<div align="center">
  <img src="landing-page/src/assets/tree.gif">
</div>

&nbsp;

## Run with Docker

```
git clone https://github.com/fynnfluegge/rocketnotes.git
cd rocketnotes
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

## AWS hosting

> Hosting on your own AWS account will cost you less than **$1 per month** under normal usage.

### Prerequisites

The following tools need to be installed on your system prior to build and deploy to AWS:

- [Node.js >= 18.x](https://nodejs.org/download/release/latest-v14.x/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [AWS CDK](https://github.com/aws/aws-cdk)

```
git clone https://github.com/fynnfluegge/rocketnotes.git
cd rocketnotes
npm install
```

</br>

### Initial Setup

In order to deploy Rocketnotes at AWS you need an AWS Account and configure the AWS CLI locally with `aws configure` as usual.
The deployment itself is very straight forward.

But First, there need to be an existing Cognito user pool and a Hosted Zone associated with your AWS account in the region where you are going to deploy against.
You can create a Cognito user pool with a user domain and an app client with the aws console or also programmatically with the AWS CDK.
You find an example how to do it with the cdk in Go [here](https://github.com/fynnfluegge/aws-cdk-go-templates/tree/main/cognito-httpapi).
If you want to create the cognito resources via the aws console, there are plenty of resources available how to do it. Here is a good [guide](https://docs.aws.amazon.com/cognito/latest/developerguide/getting-started-with-cognito-user-pools.html) to do so.

Second, you need an existing hosted zone in the target region of your AWS account. This requires a domain you are in charge of.
How to create a hosted zone and configure Route 53 as a DNS service with your domain you will find [here](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingHostedZone.html).

### Deploy all AWS resources

The following environment variables are required for the deployment:

```bash
export AWS_ACCOUNT="<YOUR_AWS_ACCOUNT_ID>"
export AWS_REGION="<YOUR_AWS_REGION>"
export COGNITO_USER_POOL_ID="<YOUR_COGNITO_USER_POOL_ID>"
export COGNITO_APP_CLIENT_ID="<YOUR_COGNITO_APP_CLIENT_ID>"
export DOMAIN_NAME="<YOUR_DOMAIN_NAME>"
export DOMAIN="<YOUR_DOMAIN>"
export SUBDOMAIN="<YOUR_SUBDOMAIN>" # <- use "www" here if you don't have a subdomain configured in your hosted zone (e.g app)
```

> **_NOTE:_** <YOUR_DOMAIN_NAME> is your domain **without** extension like ".com" while <YOUR_DOMAIN> is your domain **with** extension in this context.

Once your environment variables are specified run:

```
cd cdk
cdk deploy
```

The first deployment will take some minutes, since all the resources and lambda functions need to be initially created. If the deployment was successful the api url should be logged in the console as `HTTP API endpoint URL`.

### Build webapp

The Angular webapp needs to be bundled in production mode.
The following environment variables are required for the production build:

```bash
export REDIRECT_SIGN_IN="<YOUR_DOMAIN_URL>"
export REDIRECT_SIGN_OUT="<YOUR_DOMAIN_URL/logout>"
export AUTH_GUARD_REDIRECT="<AUTH_GUARD_REDIRECT_URL>" # <- "https://<YOUR_DOMAIN_NAME>.auth.<AWS_REGION>.amazoncognito.com/login?response_type=code&client_id=<YOUR_COGNITO_APP_CLIENT_ID>&redirect_uri=https://<YOUR_SUBDOMAIN>.<YOUR_DOMAIN>"
export API_URL="<YOUR_API_URL>" # <- HTTP API endpoint URL from deployment console log
```

Once your environment variables are set run:

```
cd webapp
npm install
npm run build
```

### Deploy webapp

Finally, the Angular app can be deployed to S3 by again running:

```
cd cdk
cdk deploy
```

</br>

## 🌟 Contributing

The most comfortable way to get started is to open the project in a ready-to-code Gitpod workspace with all packages & tools preinstalled and a running database with sample data.

<div align="center">
<a href="https://gitpod.io/#https://github.com/fynnfluegge/rocketnotes">
    <img src="https://gitpod.io/button/open-in-gitpod.svg" height="48">
  </a>
</div>

If you prefer to setup the project on your local machine continue to the next section and learn all required steps to run the project locally in development mode.

### Setup local dev environment

First, the following tools and frameworks need to be installed on your system prior to start:
- [Docker](https://docs.docker.com/get-docker/)
- [Node.js >= 14.x](https://nodejs.org/download/release/latest-v14.x/)
- [Go 1.x](https://go.dev/doc/install)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

Second, fork the repository, and then run the following commands to clone the repository locally.

```
git clone https://github.com/{your-account}/rocketnotes.git
cd rocketnotes
```

#### 1. Start DynamoDB and S3 mock with docker
```
docker-compose up dynamodb s3 -d
```
#### 2. Init tables and create data for default user
```
sh ./dynamodb-init.sh
```
#### 3. Build and start Lambda functions with AWS SAM
```
sam build
sam local start-api --docker-network rocketnotes_local-serverless-network --warm-containers EAGER 
```
#### 4. Start Angular app
```bash
export BASE_API_URL="http://localhost:3000"
cd webapp
npm install
npm run start
```
Open http://localhost:4200 in your browser and you should see the Rocketnotes webapp with the cheat sheet of the default user displayed.

> **_NOTE:_**  Authentication is disabled in dev environment.

</br>

Don't hesitate to open an issue for getting some feedback about a potential bug or if you desire a missing feature.
It is appreciated to check over current [issues](https://github.com/fynnfluegge/rocketnotes/issues) and provide feedback to existing ones or even raise a PR which solves an issue.
Any contribution is welcome!
