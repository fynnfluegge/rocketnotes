package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsevents"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseventstargets"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambdaeventsources"
	"github.com/aws/aws-cdk-go/awscdk/v2/awssqs"
	"github.com/aws/aws-cdk-go/awscdkapigatewayv2alpha/v2"
	"github.com/aws/aws-cdk-go/awscdkapigatewayv2integrationsalpha/v2"
	"github.com/aws/aws-cdk-go/awscdklambdagoalpha/v2"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type TakeNiftyNotesStackProps struct {
	awscdk.StackProps
}

func NewTakeNiftyNotesStack(scope constructs.Construct, id string, props *TakeNiftyNotesStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	userPoolId := "eu-central-1_FjpoPfr51"

	dynamoDBRole := awsiam.NewRole(stack, aws.String("myDynamoDBFullAccessRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(aws.String("lambda.amazonaws.com"), &awsiam.ServicePrincipalOpts{}),
		ManagedPolicies: &[]awsiam.IManagedPolicy{
			awsiam.ManagedPolicy_FromManagedPolicyArn(stack, aws.String("AmazonDynamoDBFullAccess"), aws.String("arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess")),
			awsiam.ManagedPolicy_FromManagedPolicyArn(stack, aws.String("AWSLambdaBasicExecutionRole"), aws.String("arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole")),
		},
	})

	// GET Document Api

	httpApi := awscdkapigatewayv2alpha.NewHttpApi(stack, jsii.String("MyHttpApi"), &awscdkapigatewayv2alpha.HttpApiProps{
		ApiName: jsii.String("MyHttpApi"),
		CorsPreflight: &awscdkapigatewayv2alpha.CorsPreflightOptions{
			AllowOrigins: jsii.Strings("*"),
			AllowHeaders: jsii.Strings("*"),
			AllowMethods: &[]awscdkapigatewayv2alpha.CorsHttpMethod{
				awscdkapigatewayv2alpha.CorsHttpMethod_OPTIONS,
				awscdkapigatewayv2alpha.CorsHttpMethod_GET,
				awscdkapigatewayv2alpha.CorsHttpMethod_POST,
			},
		},
	})

	authorizer := awscdkapigatewayv2alpha.NewHttpAuthorizer(stack, jsii.String("MyHttpAuthorizer"), &awscdkapigatewayv2alpha.HttpAuthorizerProps{
		AuthorizerName: jsii.String("MyHttpAuthorizer"),
		HttpApi:        httpApi,
		Type:           awscdkapigatewayv2alpha.HttpAuthorizerType_JWT,
		JwtIssuer:      jsii.String("https://cognito-idp.eu-central-1.amazonaws.com/" + userPoolId),
		JwtAudience:    jsii.Strings("4it9fm6jifrvov4djvep3vn9sp"),
		IdentitySource: jsii.Strings("$request.header.Authorization"),
	})

	httpApiAuthorizer := awscdkapigatewayv2alpha.HttpAuthorizer_FromHttpAuthorizerAttributes(stack, jsii.String("MyHttpAuthorizer4Test"), &awscdkapigatewayv2alpha.HttpAuthorizerAttributes{
		AuthorizerId:   authorizer.AuthorizerId(),
		AuthorizerType: jsii.String("JWT"),
	})

	getDocumentHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("GET-Document"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("GET-Document"),
		Runtime:      awslambda.Runtime_GO_1_X(),
		Entry:        jsii.String("./lambda-handler/get-document-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: dynamoDBRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/document/{documentId}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_GET},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("MyHttpLambdaIntegration"), getDocumentHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// GET Document Tree Api

	getDocumentTreeHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("GET-DocumentTree"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("GET-DocumentTree"),
		Runtime:      awslambda.Runtime_GO_1_X(),
		Entry:        jsii.String("./lambda-handler/get-document-tree-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: dynamoDBRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/documentTree/{userId}"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_GET},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("MyHttpLambdaIntegration"), getDocumentTreeHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

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

	// POST Document Api

	rule := awsevents.NewRule(stack, jsii.String("myEventBusRule"), &awsevents.RuleProps{
		EventBus: eventBus,
		EventPattern: &awsevents.EventPattern{
			Source:     &[]*string{jsii.String("MyCdkApp")},
			DetailType: &[]*string{jsii.String("message-for-queue")},
			Region:     &[]*string{jsii.String("eu-central-1")},
		},
	})

	queue := awssqs.NewQueue(stack, jsii.String("EventbridgeSqsQueue"), &awssqs.QueueProps{
		VisibilityTimeout: awscdk.Duration_Seconds(jsii.Number(300)),
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

	postDocumentHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-Document"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-Document"),
		Runtime:      awslambda.Runtime_GO_1_X(),
		Entry:        jsii.String("./lambda-handler/save-document-handler"),
		Events: &[]awslambda.IEventSource{
			awslambdaeventsources.NewSqsEventSource(queue, &awslambdaeventsources.SqsEventSourceProps{
				BatchSize: jsii.Number(10),
			}),
		},
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
	})

	postDocumentHandler.AddToRolePolicy(
		awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
			Effect:    awsiam.Effect_ALLOW,
			Resources: &[]*string{jsii.String("*")},
			Actions:   &[]*string{jsii.String("dynamodb:*")},
		}),
	)

	// POST DocumentTree Api

	postDocumentTreeHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-DocumentTree"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-DocumentTree"),
		Runtime:      awslambda.Runtime_GO_1_X(),
		Entry:        jsii.String("./lambda-handler/save-document-tree-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: dynamoDBRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/saveDocumentTree"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("postDocumentTreeLambdaIntegration"), postDocumentTreeHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	// POST Document Title Api

	postDocumentTitleHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("POST-DocumentTitle"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("POST-DocumentTitle"),
		Runtime:      awslambda.Runtime_GO_1_X(),
		Entry:        jsii.String("./lambda-handler/save-document-title-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: &[]*string{jsii.String(`-ldflags "-s -w"`)},
		},
		Role: dynamoDBRole,
	})

	httpApi.AddRoutes(&awscdkapigatewayv2alpha.AddRoutesOptions{
		Path:        jsii.String("/saveDocumentTitle"),
		Authorizer:  httpApiAuthorizer,
		Methods:     &[]awscdkapigatewayv2alpha.HttpMethod{awscdkapigatewayv2alpha.HttpMethod_POST},
		Integration: awscdkapigatewayv2integrationsalpha.NewHttpLambdaIntegration(jsii.String("postDocumentTitleLambdaIntegration"), postDocumentTitleHandler, &awscdkapigatewayv2integrationsalpha.HttpLambdaIntegrationProps{}),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewTakeNiftyNotesStack(app, "TakeNiftyNotesStack", &TakeNiftyNotesStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {
	// If unspecified, this stack will be "environment-agnostic".
	// Account/Region-dependent features and context lookups will not work, but a
	// single synthesized template can be deployed anywhere.
	//---------------------------------------------------------------------------
	return nil

	// Uncomment if you know exactly what account and region you want to deploy
	// the stack to. This is the recommendation for production stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String("123456789012"),
	//  Region:  jsii.String("us-east-1"),
	// }

	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	//  Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
