# Installation

### Prerequisites

Clone the project:

```
git clone https://github.com/{your-account}/rocketnotes.git
cd rocketnotes
```

## Run on your local machine with Docker

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

## AWS hosting

> Hosting on your own AWS account will cost you less than **$1 per month** under normal usage.

The following tools need to be installed on your system prior to build and deploy to AWS:

- [Node.js >= 18.x](https://nodejs.org/download/release/latest-v14.x/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [AWS CDK](https://github.com/aws/aws-cdk)

### Initial Setup

In order to deploy Rocketnotes to AWS you need an AWS Account and configure the AWS CLI locally with `aws configure` as usual.
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

The first deployment will take some minutes, since all the resources and lambda functions need to be initially created. If the deployment was successfull the api url should be logged in the console as `HTTP API endpoint URL`.

### Build webapp

The Angular webapp need to be bundled in production mode.
The following environment variables are required for the production build:

```bash
export REDIRECT_SIGN_IN="<YOUR_DOMAIN_URL>"
export REDIRECT_SIGN_OUT="<YOUR_DOMAIN_URL/logout>"
export AUTH_GUARD_REDIRECT="<AUTH_GUARD_REDIRECT_URL>" # <- "https://<YOUR_DOMAIN_NAME>.auth.<AWS_REGION>.amazoncognito.com/login?response_type=code&client_id=<YOUR_COGNITO_APP_CLIENT_ID>&redirect_uri=https://<YOUR_SUBDOMAIN>.<YOUR_DOMAIN>"
export API_URL="<YOUR_API_URL>" # <- HTTP API endpoint URL from deployment console log
```

Once your environment variables are specified run:

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
