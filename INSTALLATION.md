# Installation
This document describes how to deploy your personal Rocketnotes installation in the cloud at AWS or on-premise on your own server.

### Prerequisites
The following tools need to be installed on your system prior to build and deploy to AWS or to your own infrastructure:

- Node
- Yarn
- AWS CLI


First fork the repository, and then run the following commands to clone the repository locally.

```console
$ git clone https://github.com/{your-account}/rocketnotes.git
$ cd rocketnotes
$ yarn install
```

## Cloud hosting
### Prerequisites
The following tools need to be installed on your system prior to build and deploy to AWS:

- AWS CDK

### Build

### Deploy
In order to deploy Rocketnotes at AWS you need an AWS Account and configure the AWS CLI locally with `aws configure` as usual.
The deployment itself is very straight forward.

But First, in order to do the initial deployment, there need to be an existing cognito-userpool and a Hosted Zone registered in your region where you are going to deploy against.
You can create a cognito-userpool with a user domain and an app client with the aws console or also programmatically with the aws-cdk.
You find an example how to do it with the cdk here [example](asd).
If you want to create the cognito resources via the aws console, there are plenty of resources available how to do it. Here is a good [guide](ass) for example.

Second, you need an existing Hosted Zone in the target region of your AWS account. This requires a domain you are in charge of.
How to create a Hosted Zone and configure Route 53 as a DNS service with your domain you find [here](asfasf).

If your Cognito userpool and hosted zone are successfully created, you are ready to deploy with:

```console
$ cd cdk
$ cdk deploy
```
The first deployment will take some minutes, since all the resources and lambda functions need to be initially created.

## On-premise hosting
To be defined
