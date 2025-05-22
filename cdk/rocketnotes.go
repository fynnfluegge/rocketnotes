package main

import (
	"os"
	"strconv"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscertificatemanager"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfront"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsecrassets"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsevents"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseventstargets"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambdaeventsources"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsroute53"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsroute53targets"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3assets"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3deployment"
	"github.com/aws/aws-cdk-go/awscdk/v2/awssqs"
	"github.com/aws/aws-cdk-go/awscdkapigatewayv2alpha/v2"
	"github.com/aws/aws-cdk-go/awscdkapigatewayv2integrationsalpha/v2"
	"github.com/aws/aws-cdk-go/awscdklambdagoalpha/v2"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type RocketnotesStackProps struct {
	awscdk.StackProps
	CognitoAppClientId string
	CognitoUserPoolId  string
	Domain             string
	Subdomain          string
	DeployLandingPage  string
}

func RocketnotesStack(scope constructs.Construct, id string, props *RocketnotesStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	lambdaBasicExecutionPolicy := awsiam.ManagedPolicy_FromManagedPolicyArn(stack, aws.String("AWSLambdaBasicExecutionRole"), aws.String("arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"))
	dynamoDbFullAccessPolicy := awsiam.ManagedPolicy_FromManagedPolicyArn(stack, aws.String("AmazonDynamoDBFullAccess"), aws.String("arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"))
	sqsFullAccessPolicy := awsiam.ManagedPolicy_FromManagedPolicyArn(stack, aws.String("AmazonSQSFullAccess"), aws.String("arn:aws:iam::aws:policy/AmazonSQSFullAccess"))
	s3FullAccessPolicy := awsiam.ManagedPolicy_FromManagedPolicyArn(stack, aws.String("AmazonS3FullAccess"), aws.String("arn:aws:iam::aws:policy/AmazonS3FullAccess"))

	lambdaSqsDynamoDbRole := awsiam.NewRole(stack, aws.String("lambdaSqsDynamoDbRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(aws.String("lambda.amazonaws.com"), &awsiam.ServicePrincipalOpts{}),
		ManagedPolicies: &[]awsiam.IManagedPolicy{
			lambdaBasicExecutionPolicy,
			dynamoDbFullAccessPolicy,
			sqsFullAccessPolicy,
		},
	})

	lambdaDynamoDbRole := awsiam.NewRole(stack, aws.String("lambdaDynamoDbRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(aws.String("lambda.amazonaws.com"), &awsiam.ServicePrincipalOpts{}),
		ManagedPolicies: &[]awsiam.IManagedPolicy{
			lambdaBasicExecutionPolicy,
			dynamoDbFullAccessPolicy,
		},
	})

	lambdaS3SqsDynamoDbRole := awsiam.NewRole(stack, aws.String("lambdaS3SqsDynamoDbRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(aws.String("lambda.amazonaws.com"), &awsiam.ServicePrincipalOpts{}),
		ManagedPolicies: &[]awsiam.IManagedPolicy{
			dynamoDbFullAccessPolicy,
			sqsFullAccessPolicy,
			lambdaBasicExecutionPolicy,
			s3FullAccessPolicy,
		},
	})

	lambdaS3DynamoDbRole := awsiam.NewRole(stack, aws.String("lambdaS3DynamoDbRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(aws.String("lambda.amazonaws.com"), &awsiam.ServicePrincipalOpts{}),
		ManagedPolicies: &[]awsiam.IManagedPolicy{
			lambdaBasicExecutionPolicy,
			s3FullAccessPolicy,
			dynamoDbFullAccessPolicy,
		},
	})

	// Http Api with Authorization

	httpApi := awscdkapigatewayv2alpha.NewHttpApi(stack, jsii.String("MyHttpApi"), &awscdkapigatewayv2alpha.HttpApiProps{
		ApiName: jsii.String("MyHttpApi"),
		CorsPreflight: &awscdkapigatewayv2alpha.CorsPreflightOptions{
			AllowOrigins: jsii.Strings("*"),
			AllowHeaders: jsii.Strings("*"),
			AllowMethods: &[]awscdkapigatewayv2alpha.CorsHttpMethod{
				awscdkapigatewayv2alpha.CorsHttpMethod_OPTIONS,
				awscdkapigatewayv2alpha.CorsHttpMethod_GET,
				awscdkapigatewayv2alpha.CorsHttpMethod_POST,
				awscdkapigatewayv2alpha.CorsHttpMethod_DELETE,
			},
		},
	})

	authorizer := awscdkapigatewayv2alpha.NewHttpAuthorizer(stack, jsii.String("MyHttpAuthorizer"), &awscdkapigatewayv2alpha.HttpAuthorizerProps{
		AuthorizerName: jsii.String("MyHttpAuthorizer"),
		HttpApi:        httpApi,
		Type:           awscdkapigatewayv2alpha.HttpAuthorizerType_JWT,
		JwtIssuer:      jsii.String("https://cognito-idp." + *props.Env.Region + ".amazonaws.com/" + props.CognitoUserPoolId),
		JwtAudience:    jsii.Strings(props.CognitoAppClientId), // Look this up in Cognito Userpool App Client settings. It’s the App client ID.
		IdentitySource: jsii.Strings("$request.header.Authorization"),
	})

	httpApiAuthorizer := awscdkapigatewayv2alpha.HttpAuthorizer_FromHttpAuthorizerAttributes(stack, jsii.String("MyHttpAuthorizer4Test"), &awscdkapigatewayv2alpha.HttpAuthorizerAttributes{
		AuthorizerId:   authorizer.AuthorizerId(),
		AuthorizerType: jsii.String("JWT"),
	})

	// GET Document Api

	getDocumentHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("GET-Document"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("GET-Document"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/get-document-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/document/{documentId}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_GET},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("MyHttpLambdaIntegration"), getDocumentHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// GET User Config Api
	getUserConfigHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("GET-UserConfig"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("GET-UserConfig"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/get-user-config-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/userConfig/{userId}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_GET},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("MyHttpLambdaIntegration"), getUserConfigHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// GET Shared Document Api

	getSharedDocumentHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("GET-Shared-Document"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("GET-Shared-Document"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/get-shared-document-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/shared/{documentId}"),
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_GET},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("MyHttpLambdaIntegration"), getSharedDocumentHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// GET Document Tree Api

	getDocumentTreeHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("GET-DocumentTree"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("GET-DocumentTree"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/get-document-tree-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/documentTree/{userId}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_GET},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("MyHttpLambdaIntegration"), getDocumentTreeHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// GET search Documents API

	searchDocumentHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("GET-search-Documents"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("GET-search-Documents"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/search-document-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/search-documents/{userId}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_GET},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("MyHttpLambdaIntegration"), searchDocumentHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// POST delete Document API

	// TODO

	// Eventbridge

	eventBus := awsevents.NewEventBus(stack, jsii.String("myEventBus"), &awsevents.EventBusProps{
		EventBusName: jsii.String("MyEventBus"),
	})

	apiRole := awsiam.NewRole(stack, jsii.String("EventBridgeIntegrationRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(jsii.String("apigateway.amazonaws.com"), &awsiam.ServicePrincipalOpts{}),
	})

	apiRole.AddToPolicy(
		awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
			Effect:    awsiam.Effect_ALLOW,
			Resources: &[]*string{jsii.String(*eventBus.EventBusArn())},
			Actions:   &[]*string{jsii.String("events:putEvents")},
		}),
	)

	// Save Document Api

	rule := awsevents.NewRule(stack, jsii.String("myEventBusRule"), &awsevents.RuleProps{
		EventBus: eventBus,
		EventPattern: &awsevents.EventPattern{
			Source:     &[]*string{jsii.String("MyCdkApp")},
			DetailType: &[]*string{jsii.String("message-for-queue")},
			Region:     &[]*string{props.Env.Region},
		},
	})

	queue := awssqs.NewQueue(stack, jsii.String("EventbridgeSqsQueue"), &awssqs.QueueProps{
		VisibilityTimeout: awscdk.Duration_Seconds(jsii.Number(30)),
		RetentionPeriod:   awscdk.Duration_Seconds(jsii.Number(60)),
	})

	vectorQueue := awssqs.NewQueue(stack, jsii.String("VectorSqsQueue"), &awssqs.QueueProps{
		VisibilityTimeout: awscdk.Duration_Seconds(jsii.Number(900)),
		RetentionPeriod:   awscdk.Duration_Seconds(jsii.Number(1200)),
	})

	rule.AddTarget(awseventstargets.NewSqsQueue(queue, &awseventstargets.SqsQueueProps{}))

	integration := awscdkapigatewayv2alpha.NewHttpIntegration(stack, jsii.String("myEventBridgeHttpIntegration"), &awscdkapigatewayv2alpha.HttpIntegrationProps{
		HttpApi:            httpApi,
		IntegrationType:    awscdkapigatewayv2alpha.HttpIntegrationType_AWS_PROXY,
		IntegrationSubtype: awscdkapigatewayv2alpha.HttpIntegrationSubtype_EVENTBRIDGE_PUT_EVENTS,
		Credentials:        awscdkapigatewayv2alpha.IntegrationCredentials_FromRole(apiRole),
		ParameterMapping: awscdkapigatewayv2alpha.ParameterMapping_FromObject(&map[string]awscdkapigatewayv2alpha.MappingValue{
			"Source":       awscdkapigatewayv2alpha.MappingValue_Custom(jsii.String("MyCdkApp")),
			"DetailType":   awscdkapigatewayv2alpha.MappingValue_Custom(jsii.String("message-for-queue")),
			"Detail":       awscdkapigatewayv2alpha.MappingValue_Custom(jsii.String("$request.body")),
			"EventBusName": awscdkapigatewayv2alpha.MappingValue_Custom(eventBus.EventBusArn()),
		}),
		PayloadFormatVersion: awscdkapigatewayv2alpha.PayloadFormatVersion_VERSION_1_0(),
	})

	awsapigatewayv2.NewCfnRoute(stack, jsii.String("myEventRoute"), &awsapigatewayv2.CfnRouteProps{
		ApiId:             httpApi.HttpApiId(),
		RouteKey:          jsii.String("POST /saveDocument"),
		Target:            jsii.String("integrations/" + *integration.IntegrationId()),
		AuthorizerId:      authorizer.AuthorizerId(),
		AuthorizationType: jsii.String("JWT"),
	})

	awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-Document"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-Document"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/save-document-handler/main.go"),
		Events: &[]awslambda.IEventSource{
			awslambdaeventsources.NewSqsEventSource(queue, &awslambdaeventsources.SqsEventSourceProps{
				BatchSize: jsii.Number(1),
			}),
		},
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Environment: &map[string]*string{"queueUrl": vectorQueue.QueueUrl()},
		Role:        lambdaSqsDynamoDbRole,
	})

	// POST Save User Config Api
	postUserConfigHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-UserConfig"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-UserConfig"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/save-user-config-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Environment: &map[string]*string{"queueUrl": vectorQueue.QueueUrl()},
		Role:        lambdaSqsDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/userConfig"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("postUserConfigLambdaIntegration"), postUserConfigHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// POST DocumentTree Api

	postDocumentTreeHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-DocumentTree"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-DocumentTree"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/save-document-tree-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/saveDocumentTree"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("postDocumentTreeLambdaIntegration"), postDocumentTreeHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// POST Set Document Title Api

	postDocumentTitleHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-DocumentTitle"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-DocumentTitle"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/save-document-title-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/saveDocumentTitle"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("postDocumentTitleLambdaIntegration"), postDocumentTitleHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// POST Share Document Api

	postShareDocumentHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-share-Document"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-share-Document"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/save-document-public-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/shareDocument"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("postShareDocumentLambdaIntegration"), postShareDocumentHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// DELETE Document Api

	deleteDocumentHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("DELETE-Document"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("DELETE-Document"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/delete-document-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaSqsDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/deleteDocument/{id}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_DELETE},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("deleteDocumentLambdaIntegration"), deleteDocumentHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// Save Vector embeddings

	bucket := awss3.NewBucket(stack, jsii.String("VectorEmbeddingsBucket"), &awss3.BucketProps{
		BucketName:       jsii.String("rocketnotes-vector-embeddings"),
		PublicReadAccess: jsii.Bool(false),
		AccessControl:    awss3.BucketAccessControl_BUCKET_OWNER_FULL_CONTROL,
	})

	awslambda.NewDockerImageFunction(stack, jsii.String("VectorEmbeddingsHandler"), &awslambda.DockerImageFunctionProps{
		FunctionName: jsii.String("VectorEmbeddings-Docker"),
		Code: awslambda.DockerImageCode_FromImageAsset(jsii.String("../handler-py/rocketnotes_handler/handler_vector_embeddings"), &awslambda.AssetImageCodeProps{
			Platform: awsecrassets.Platform_LINUX_AMD64(),
		}),
		Events: &[]awslambda.IEventSource{
			awslambdaeventsources.NewSqsEventSource(vectorQueue, &awslambdaeventsources.SqsEventSourceProps{
				BatchSize: jsii.Number(1),
			}),
		},
		Environment: &map[string]*string{"BUCKET_NAME": bucket.BucketName()},
		Role:        lambdaS3SqsDynamoDbRole,
		MemorySize:  jsii.Number(1024),
		Timeout:     awscdk.Duration_Seconds(jsii.Number(900)),
	})

	// Semantic search handler

	semanticSearchHandler := awslambda.NewDockerImageFunction(stack, jsii.String("SemanticSearchHandler"), &awslambda.DockerImageFunctionProps{
		FunctionName: jsii.String("SemanticSearch-Docker"),
		Code: awslambda.DockerImageCode_FromImageAsset(jsii.String("../handler-py/rocketnotes_handler/handler_semantic_search"), &awslambda.AssetImageCodeProps{
			Platform: awsecrassets.Platform_LINUX_AMD64(),
		}),
		Environment: &map[string]*string{"BUCKET_NAME": bucket.BucketName()},
		Role:        lambdaS3DynamoDbRole,
		MemorySize:  jsii.Number(1024),
		Timeout:     awscdk.Duration_Seconds(jsii.Number(900)),
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/semanticSearch"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("semanticSearchLambdaIntegration"), semanticSearchHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// Chat handler

	chatHandler := awslambda.NewDockerImageFunction(stack, jsii.String("ChatHandler"), &awslambda.DockerImageFunctionProps{
		FunctionName: jsii.String("Chat-Docker"),
		Code: awslambda.DockerImageCode_FromImageAsset(jsii.String("../handler-py/rocketnotes_handler/handler_chat"), &awslambda.AssetImageCodeProps{
			Directory: jsii.String("../handler-py/rocketnotes_handler"),
			File:      jsii.String("handler_chat/Dockerfile"),
			Platform:  awsecrassets.Platform_LINUX_AMD64(),
		}),
		Environment: &map[string]*string{"BUCKET_NAME": bucket.BucketName()},
		Role:        lambdaS3DynamoDbRole,
		MemorySize:  jsii.Number(1024),
		Timeout:     awscdk.Duration_Seconds(jsii.Number(900)),
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/chat"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("chatLambdaIntegration"), chatHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// Zettelkasten handler

	// get zettel kasten
	getZettelKastenHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("GET-ZettelKasten"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("GET-ZettelKasten"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/get-zettelkasten-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/zettelkasten/{userId}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_GET},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("getZettelkastenLambdaIntegration"), getZettelKastenHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// save zettel
	saveZettelHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-save-Zettel"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-save-Zettel"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/save-zettel-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/saveZettel"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("saveZettelLambdaIntegration"), saveZettelHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// delete zettel
	deleteZettelHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("DELETE-Zettel"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("DELETE-Zettel"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/delete-zettel-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/deleteZettel/{id}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_DELETE},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("deleteZettelLambdaIntegration"), deleteZettelHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// archive zettel
	archiveZettelHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-archive-Zettel"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-archive-Zettel"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/archive-zettel-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Environment: &map[string]*string{"queueUrl": vectorQueue.QueueUrl()},
		Role:        lambdaSqsDynamoDbRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/archiveZettel/{documentId}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("archiveZettelLambdaIntegration"), archiveZettelHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// sign-up confirmation lambda handler

	awscdklambdagoalpha.NewGoFunction(stack, jsii.String("Sign-up-confirmation-handler"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("Sign-up-confirmation-handler"),
		Runtime:      awslambda.Runtime_PROVIDED_AL2(),
		Entry:        jsii.String("../handler-go/sign-up-confirmation-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: lambdaSqsDynamoDbRole,
	})

	// hosted zone & certificate

	zone := awsroute53.HostedZone_FromLookup(stack, jsii.String("MyHostedZone"), &awsroute53.HostedZoneProviderProps{
		DomainName: jsii.String(props.Domain),
	})

	certificateArn := awscertificatemanager.NewDnsValidatedCertificate(stack, jsii.String("MySiteCertificate"), &awscertificatemanager.DnsValidatedCertificateProps{
		DomainName: jsii.String("*." + props.Domain),
		HostedZone: zone,
		Region:     jsii.String("us-east-1"), // Cloudfront only checks this region for certificates.
	})

	cloudfrontOAI := awscloudfront.NewOriginAccessIdentity(stack, jsii.String("MyOriginAccessIdentity"), &awscloudfront.OriginAccessIdentityProps{
		Comment: jsii.String("OAI for " + props.Domain),
	})

	// distribution & deployment

	// App

	appViewerCertificate := awscloudfront.ViewerCertificate_FromAcmCertificate(
		certificateArn,
		&awscloudfront.ViewerCertificateOptions{
			SslMethod:      awscloudfront.SSLMethod_SNI,
			SecurityPolicy: awscloudfront.SecurityPolicyProtocol_TLS_V1_1_2016,
			Aliases:        jsii.Strings(props.Subdomain + "." + props.Domain),
		},
	)

	appBucket := awss3.NewBucket(stack, jsii.String("MyS3Bucket"), &awss3.BucketProps{
		BucketName:           jsii.String(props.Subdomain + "." + props.Domain),
		WebsiteIndexDocument: jsii.String("index.html"),
		WebsiteErrorDocument: jsii.String("index.html"),
		PublicReadAccess:     jsii.Bool(true),
		BlockPublicAccess:    awss3.BlockPublicAccess_BLOCK_ACLS(),
		AccessControl:        awss3.BucketAccessControl_BUCKET_OWNER_FULL_CONTROL,
	})

	appBucket.AddToResourcePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   jsii.Strings("s3:GetObject"),
		Resources: jsii.Strings(*appBucket.ArnForObjects(jsii.String("*"))),
		Principals: &[]awsiam.IPrincipal{
			awsiam.NewCanonicalUserPrincipal(cloudfrontOAI.CloudFrontOriginAccessIdentityS3CanonicalUserId()),
		},
	}))

	appCloudFrontDistribution := awscloudfront.NewCloudFrontWebDistribution(stack, jsii.String("MainAppCloudFrontDistribution"), &awscloudfront.CloudFrontWebDistributionProps{
		ViewerCertificate: appViewerCertificate,
		ErrorConfigurations: &[]*awscloudfront.CfnDistribution_CustomErrorResponseProperty{
			{
				ErrorCode:          jsii.Number(403),
				ResponseCode:       jsii.Number(200),
				ErrorCachingMinTtl: jsii.Number(300),
				ResponsePagePath:   jsii.String("/index.html"),
			},
		},
		OriginConfigs: &[]*awscloudfront.SourceConfiguration{
			{
				S3OriginSource: &awscloudfront.S3OriginConfig{
					S3BucketSource:       appBucket,
					OriginAccessIdentity: cloudfrontOAI,
				},
				Behaviors: &[]*awscloudfront.Behavior{
					{
						IsDefaultBehavior: jsii.Bool(true),
						Compress:          jsii.Bool(true),
						AllowedMethods:    awscloudfront.CloudFrontAllowedMethods_GET_HEAD_OPTIONS,
					},
				},
			},
		},
	})

	awsroute53.NewARecord(stack, jsii.String("MySiteAliasRecord"), &awsroute53.ARecordProps{
		RecordName: jsii.String(props.Subdomain + "." + props.Domain),
		Target:     awsroute53.RecordTarget_FromAlias(awsroute53targets.NewCloudFrontTarget(appCloudFrontDistribution)),
		Zone:       zone,
	})

	// Deploy web app if build exists
	if _, err := os.Stat("../webapp/build/index.html"); err == nil {
		awss3deployment.NewBucketDeployment(stack, jsii.String("MyS3BucketDeployment"), &awss3deployment.BucketDeploymentProps{
			Sources: &[]awss3deployment.ISource{
				awss3deployment.Source_Asset(jsii.String("../webapp/build"), &awss3assets.AssetOptions{}),
			},
			DestinationBucket: appBucket,
			Distribution:      appCloudFrontDistribution,
			DistributionPaths: jsii.Strings("/*"),
		})
	}

	// Deploy landing page and electron installer if explicitly specified in environment variables
	if _, err := strconv.ParseBool(props.DeployLandingPage); err == nil {

		// landing page

		landingPageViewerCertificate := awscloudfront.ViewerCertificate_FromAcmCertificate(
			certificateArn,
			&awscloudfront.ViewerCertificateOptions{
				SslMethod:      awscloudfront.SSLMethod_SNI,
				SecurityPolicy: awscloudfront.SecurityPolicyProtocol_TLS_V1_1_2016,
				Aliases:        jsii.Strings("www." + props.Domain),
			},
		)

		landingPageBucket := awss3.NewBucket(stack, jsii.String("LandingPageS3Bucket"), &awss3.BucketProps{
			BucketName:           jsii.String(props.Domain),
			WebsiteIndexDocument: jsii.String("index.html"),
			WebsiteErrorDocument: jsii.String("index.html"),
			PublicReadAccess:     jsii.Bool(true),
			BlockPublicAccess:    awss3.BlockPublicAccess_BLOCK_ACLS(),
			AccessControl:        awss3.BucketAccessControl_BUCKET_OWNER_FULL_CONTROL,
		})

		landingPageBucket.AddToResourcePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
			Actions:   jsii.Strings("s3:GetObject"),
			Resources: jsii.Strings(*landingPageBucket.ArnForObjects(jsii.String("*"))),
			Principals: &[]awsiam.IPrincipal{
				awsiam.NewCanonicalUserPrincipal(cloudfrontOAI.CloudFrontOriginAccessIdentityS3CanonicalUserId()),
			},
		}))

		landingPageCloudFrontDistribution := awscloudfront.NewCloudFrontWebDistribution(stack, jsii.String("MyCloudFrontDistribution"), &awscloudfront.CloudFrontWebDistributionProps{
			ViewerCertificate: landingPageViewerCertificate,
			ErrorConfigurations: &[]*awscloudfront.CfnDistribution_CustomErrorResponseProperty{
				{
					ErrorCode:          jsii.Number(403),
					ResponseCode:       jsii.Number(200),
					ErrorCachingMinTtl: jsii.Number(300),
					ResponsePagePath:   jsii.String("/index.html"),
				},
			},
			OriginConfigs: &[]*awscloudfront.SourceConfiguration{
				{
					S3OriginSource: &awscloudfront.S3OriginConfig{
						S3BucketSource:       landingPageBucket,
						OriginAccessIdentity: cloudfrontOAI,
					},
					Behaviors: &[]*awscloudfront.Behavior{
						{
							IsDefaultBehavior: jsii.Bool(true),
							Compress:          jsii.Bool(true),
							AllowedMethods:    awscloudfront.CloudFrontAllowedMethods_GET_HEAD_OPTIONS,
						},
					},
				},
			},
		})

		awsroute53.NewARecord(stack, jsii.String("LaningPageSiteAliasRecord"), &awsroute53.ARecordProps{
			RecordName: jsii.String("www." + props.Domain),
			Target:     awsroute53.RecordTarget_FromAlias(awsroute53targets.NewCloudFrontTarget(landingPageCloudFrontDistribution)),
			Zone:       zone,
		})

		awss3deployment.NewBucketDeployment(stack, jsii.String("LaningPageS3BucketDeployment"), &awss3deployment.BucketDeploymentProps{
			Sources: &[]awss3deployment.ISource{
				awss3deployment.Source_Asset(jsii.String("../landing-page/build"), &awss3assets.AssetOptions{}),
			},
			DestinationBucket: landingPageBucket,
			Distribution:      landingPageCloudFrontDistribution,
			DistributionPaths: jsii.Strings("/*"),
		})

		// Electron installer bucket

		awss3.NewBucket(stack, jsii.String("ElectronReleaseS3Bucket"), &awss3.BucketProps{
			BucketName:        jsii.String("rocketnotes-electron-releases"),
			PublicReadAccess:  jsii.Bool(true),
			BlockPublicAccess: awss3.BlockPublicAccess_BLOCK_ACLS(),
			AccessControl:     awss3.BucketAccessControl_BUCKET_OWNER_FULL_CONTROL,
		})
	}

	awscdk.NewCfnOutput(stack, jsii.String("apiUrl"), &awscdk.CfnOutputProps{
		Value:       httpApi.Url(),
		Description: jsii.String("HTTP API endpoint URL"),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	RocketnotesStack(app, "TakeNiftyNotesStack", &RocketnotesStackProps{
		awscdk.StackProps{
			Env: env(),
		},
		os.Getenv("COGNITO_APP_CLIENT_ID"),
		os.Getenv("COGNITO_USER_POOL_ID"),
		os.Getenv("DOMAIN"),
		os.Getenv("SUBDOMAIN"),
		os.Getenv("DEPLOY_LANDING_PAGE"),
	})

	app.Synth(nil)
}

func env() *awscdk.Environment {
	return &awscdk.Environment{
		Account: jsii.String(os.Getenv("AWS_ACCOUNT")),
		Region:  jsii.String(os.Getenv("AWS_REGION")),
	}
}
