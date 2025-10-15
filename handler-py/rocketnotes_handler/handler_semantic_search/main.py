
import json
import os
import boto3

from rocketnotes_handler.lib.util import get_embeddings_model, get_user_config
from rocketnotes_handler.lib.vector_store_factory import get_vector_store_factory

is_local = os.environ.get("LOCAL", False)

def get_boto3_clients():
    """Get configured boto3 clients"""
    s3_args = {}
    dynamodb_args = {}

    # Set default region if not specified
    if not os.environ.get("AWS_DEFAULT_REGION"):
        s3_args["region_name"] = "us-east-1"
        dynamodb_args["region_name"] = "us-east-1"

    if is_local:
        s3_args["endpoint_url"] = "http://s3:9090"
        dynamodb_args["endpoint_url"] = "http://dynamodb:8000"

    s3 = boto3.client("s3", **s3_args)
    dynamodb = boto3.client("dynamodb", **dynamodb_args)

    return s3, dynamodb

userConfig_table_name = "tnn-UserConfig"
documents_table_name = "tnn-Documents"


def handler(event, context):
    if "body" in event:
        try:
            request_body = json.loads(event["body"])
        except json.JSONDecodeError:
            return {"statusCode": 400, "body": "Invalid JSON format in request body"}
    else:
        return {"statusCode": 400, "body": "Request body is missing"}

    if "userId" in request_body:
        userId = request_body["userId"]
    else:
        return {"statusCode": 400, "body": "userId is missing"}

    if "searchString" in request_body:
        search_string = request_body["searchString"]
    else:
        return {"statusCode": 400, "body": "search_string is missing"}

    # Get boto3 clients
    s3, dynamodb = get_boto3_clients()

    user_config_search_result = dynamodb.get_item(
        TableName=userConfig_table_name,
        Key={"id": {"S": userId}},
    )

    if "Item" not in user_config_search_result:
        return {
            "statusCode": 404,
            "body": json.dumps("User not found"),
        }

    user_config = get_user_config(user_config_search_result)

    if user_config.embeddingsModel is None:
        return {
            "statusCode": 400,
            "body": json.dumps("Embeddings model is missing"),
        }
    else:
        embeddings = get_embeddings_model(user_config)

    # Get vector store for the user (S3 for prod, Chroma for local)
    db = get_vector_store_factory(userId, embeddings)

    similarity_search_result = db.similarity_search(search_string, k=3)
    response = []
    for result in similarity_search_result:
        document_id = result.metadata["documentId"]
        title = result.metadata["title"]

        # Extract original content from metadata _page_content by removing title prefix
        # _page_content format is: "{title}\n{original_content}"
        page_content = result.metadata.get("_page_content", "")
        if page_content.startswith(f"{title}\n"):
            content = page_content[len(title) + 1:]  # +1 for the newline
        else:
            # Fallback if format is different
            content = page_content

        response.append(
            {
                "documentId": document_id,
                "title": title,
                "content": content,
            }
        )

    return {
        "statusCode": 200,
        "body": json.dumps(response),
    }

