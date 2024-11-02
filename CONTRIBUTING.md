# Contributing to Rocketnotes 🚀

### Setup development environment

First, the following tools and frameworks need to be installed on your system:

- [Docker](https://docs.docker.com/get-docker/)
- [Node.js >= 18.x](https://nodejs.org/download/release/latest-v18.x/)
- [Go 1.x](https://go.dev/doc/install)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

Second, fork the repository and run the following commands to clone the repository locally.

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

> **_NOTE:_** Authentication is disabled in dev environment.

</br>

## All Code Changes Happen Through Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the MIT License that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using Github's issues

We use GitHub issues to track public bugs. Report a bug by opening a new issue.

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can.
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
