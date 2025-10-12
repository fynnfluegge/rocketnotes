import os
from typing import Mapping

from aws_cdk import Duration, RemovalPolicy, Stack
from aws_cdk import aws_apigatewayv2 as apigatewayv2
from aws_cdk import aws_ecr_assets
from aws_cdk import aws_iam as iam
from aws_cdk import aws_lambda
from aws_cdk import aws_s3 as s3
from aws_cdk.aws_apigatewayv2_integrations import HttpLambdaIntegration
from constructs import Construct


class RocketnotesHandlerStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        api_id = os.getenv("API_ID")
        authorizer_id = os.getenv("AUTHORIZER_ID")
        cognito_user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
        cognito_app_client_id = os.getenv("COGNITO_APP_CLIENT_ID")
        queue_url = os.getenv("VECTOR_QUEUE_URL")

        # Create S3 bucket for vector storage
        vector_bucket = s3.Bucket(
            self,
            "VectorStorageBucket",
            bucket_name="rocketnotes-vectors",
            versioned=False,
            removal_policy=RemovalPolicy.RETAIN,  # Keep bucket on stack deletion
            auto_delete_objects=False,  # Don't auto-delete objects for safety
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
        )

        insertion_lambda_function = aws_lambda.DockerImageFunction(
            self,
            "VibeInsertionLambdaFunction",
            code=aws_lambda.DockerImageCode.from_image_asset(
                directory=os.path.join(os.path.dirname(__file__), "."),
                file="handler_insert/Dockerfile",
                platform=aws_ecr_assets.Platform.LINUX_AMD64,
            ),
            role=iam.Role(
                self,
                "InsertionLambdaExecutionRole",
                assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
                managed_policies=[
                    iam.ManagedPolicy.from_aws_managed_policy_name(
                        "service-role/AWSLambdaBasicExecutionRole"
                    ),
                    iam.ManagedPolicy.from_aws_managed_policy_name(
                        "AmazonDynamoDBFullAccess"
                    ),
                    iam.ManagedPolicy.from_aws_managed_policy_name(
                        "AmazonSQSFullAccess"
                    ),
                ],
                inline_policies={
                    "VectorBucketAccess": iam.PolicyDocument(
                        statements=[
                            iam.PolicyStatement(
                                effect=iam.Effect.ALLOW,
                                actions=[
                                    "s3:GetObject",
                                    "s3:PutObject",
                                    "s3:DeleteObject",
                                    "s3:ListBucket",
                                ],
                                resources=[
                                    vector_bucket.bucket_arn,
                                    f"{vector_bucket.bucket_arn}/*",
                                ],
                            )
                        ]
                    )
                },
            ),
            timeout=Duration.seconds(300),
            memory_size=1024,
            environment={
                "QUEUE_URL": queue_url,
                "BUCKET_NAME": bucket_name,
                "VECTOR_BUCKET_NAME": vector_bucket.bucket_name,
            },
        )

        agent_lambda_function = aws_lambda.DockerImageFunction(
            self,
            "VibeAgentLambdaDockerFunction",
            code=aws_lambda.DockerImageCode.from_image_asset(
                directory=os.path.join(os.path.dirname(__file__), "."),
                file="handler_vibe/Dockerfile",
                platform=aws_ecr_assets.Platform.LINUX_AMD64,
            ),
            role=iam.Role(
                self,
                "VibeAgentLambdaExecutionRole",
                assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
                managed_policies=[
                    iam.ManagedPolicy.from_aws_managed_policy_name(
                        "service-role/AWSLambdaBasicExecutionRole"
                    ),
                    iam.ManagedPolicy.from_aws_managed_policy_name(
                        "AmazonDynamoDBReadOnlyAccess"
                    ),
                ],
                inline_policies={
                    "VectorBucketAccess": iam.PolicyDocument(
                        statements=[
                            iam.PolicyStatement(
                                effect=iam.Effect.ALLOW,
                                actions=[
                                    "s3:GetObject",
                                    "s3:PutObject",
                                    "s3:DeleteObject",
                                    "s3:ListBucket",
                                ],
                                resources=[
                                    vector_bucket.bucket_arn,
                                    f"{vector_bucket.bucket_arn}/*",
                                ],
                            )
                        ]
                    )
                },
            ),
            timeout=Duration.seconds(300),
            memory_size=1024,
            environment={
                "BUCKET_NAME": bucket_name,
                "VECTOR_BUCKET_NAME": vector_bucket.bucket_name,
            },
        )

        api = apigatewayv2.HttpApi.from_http_api_attributes(
            self,
            "ImportedHttpApi",
            http_api_id=api_id,
        )

        http_api_authorizer = (
            apigatewayv2.HttpAuthorizer.from_http_authorizer_attributes(
                self,
                "ImportedHttpAuthorizer",
                authorizer_id=authorizer_id,
                authorizer_type="JWT",
            )
        )

        apigatewayv2.HttpRoute(
            self,
            "VibeAgentLambdaRoute",
            http_api=api,
            integration=HttpLambdaIntegration(
                "VibeAgentLambdaIntegration",
                handler=agent_lambda_function,
            ),
            route_key=apigatewayv2.HttpRouteKey.with_(
                "/vibe/generate/{userId}", apigatewayv2.HttpMethod.GET
            ),
            authorizer=http_api_authorizer,
        )

        apigatewayv2.HttpRoute(
            self,
            "VibeInsertLambdaRoute",
            http_api=api,
            route_key=apigatewayv2.HttpRouteKey.with_(
                "/vibe/insert/{userId}", apigatewayv2.HttpMethod.POST
            ),
            integration=HttpLambdaIntegration(
                "VibeInsertLambdaIntegration", handler=insertion_lambda_function
            ),
            authorizer=http_api_authorizer,
        )
