package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscertificatemanager"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfront"
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
		JwtAudience:    jsii.Strings("4it9fm6jifrvov4djvep3vn9sp", "tt3v27pnqqh7elqdvq9tgmr9v"),
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

	// Save Document Api

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

	// Set Document Title Api

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

	// web app

	domain := "www.takeniftynotes.net"

	cloudfrontOAI := awscloudfront.NewOriginAccessIdentity(stack, jsii.String("MyOriginAccessIdentity"), &awscloudfront.OriginAccessIdentityProps{
		Comment: jsii.String("OAI for " + id),
	})

	zone := awsroute53.HostedZone_FromLookup(stack, jsii.String("MyHostedZone"), &awsroute53.HostedZoneProviderProps{
		DomainName: jsii.String("takeniftynotes.net"),
	})

	bucket := awss3.NewBucket(stack, jsii.String("MyS3Bucket"), &awss3.BucketProps{
		BucketName:           jsii.String("takeniftynotes.net"),
		WebsiteIndexDocument: jsii.String("index.html"),
		WebsiteErrorDocument: jsii.String("index.html"),
		PublicReadAccess:     jsii.Bool(true),
	})

	bucket.AddToResourcePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   jsii.Strings("s3:GetObject"),
		Resources: jsii.Strings(*bucket.ArnForObjects(jsii.String("*"))),
		Principals: &[]awsiam.IPrincipal{
			awsiam.NewCanonicalUserPrincipal(cloudfrontOAI.CloudFrontOriginAccessIdentityS3CanonicalUserId()),
		},
	}))

	certificateArn := awscertificatemanager.NewDnsValidatedCertificate(stack, jsii.String("MySiteCertificate"), &awscertificatemanager.DnsValidatedCertificateProps{
		DomainName: &domain,
		HostedZone: zone,
		Region:     jsii.String("us-east-1"), // Cloudfront only checks this region for certificates.
	})

	viewerCertificate := awscloudfront.ViewerCertificate_FromAcmCertificate(
		certificateArn,
		&awscloudfront.ViewerCertificateOptions{
			SslMethod:      awscloudfront.SSLMethod_SNI,
			SecurityPolicy: awscloudfront.SecurityPolicyProtocol_TLS_V1_1_2016,
			Aliases:        jsii.Strings(domain),
		},
	)

	distribution := awscloudfront.NewCloudFrontWebDistribution(stack, jsii.String("MyCloudFrontDistribution"), &awscloudfront.CloudFrontWebDistributionProps{
		ViewerCertificate: viewerCertificate,
		OriginConfigs: &[]*awscloudfront.SourceConfiguration{
			&awscloudfront.SourceConfiguration{
				S3OriginSource: &awscloudfront.S3OriginConfig{
					S3BucketSource:       bucket,
					OriginAccessIdentity: cloudfrontOAI,
				},
				Behaviors: &[]*awscloudfront.Behavior{
					&awscloudfront.Behavior{
						IsDefaultBehavior: jsii.Bool(true),
						Compress:          jsii.Bool(true),
						AllowedMethods:    awscloudfront.CloudFrontAllowedMethods_GET_HEAD_OPTIONS,
					},
				},
			},
		},
	})

	awscdk.NewCfnOutput(stack, jsii.String("MyCloudFrontWebDistributionDomainName"), &awscdk.CfnOutputProps{
		Value: distribution.DistributionDomainName(),
	})

	awsroute53.NewARecord(stack, jsii.String("MySiteAliasRecord"), &awsroute53.ARecordProps{
		RecordName: &domain,
		Target:     awsroute53.RecordTarget_FromAlias(awsroute53targets.NewCloudFrontTarget(distribution)),
		Zone:       zone,
	})

	awss3deployment.NewBucketDeployment(stack, jsii.String("MyS3BucketDeployment"), &awss3deployment.BucketDeploymentProps{
		Sources: &[]awss3deployment.ISource{
			awss3deployment.Source_Asset(jsii.String("./webapp/build"), &awss3assets.AssetOptions{}),
		},
		DestinationBucket: bucket,
		Distribution:      distribution,
		DistributionPaths: jsii.Strings("/*"),
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

func env() *awscdk.Environment {
	return &awscdk.Environment{
		Account: jsii.String(os.Getenv("AWS_ACCOUNT")),
		Region:  jsii.String(os.Getenv("AWS_REGION")),
	}
}
