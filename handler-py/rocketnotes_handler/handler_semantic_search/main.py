
import json
import os
from pathlib import Path

import boto3
from langchain_community.vectorstores import FAISS

from rocketnotes_handler.lib.util import get_embeddings_model, get_user_config

is_local = os.environ.get("LOCAL", False)
s3_args = {}
dynamodb_args = {}

if is_local:
    s3_args["endpoint_url"] = "http://s3:9090"
    dynamodb_args["endpoint_url"] = "http://dynamodb:8000"

s3 = boto3.client("s3", **s3_args)
dynamodb = boto3.client("dynamodb", **dynamodb_args)

userConfig_table_name = "tnn-UserConfig"
bucket_name = os.environ["BUCKET_NAME"]

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

    file_path = f"/tmp/{userId}"
    Path(file_path).mkdir(parents=True, exist_ok=True)
    load_from_s3(userId + ".faiss", f"{file_path}/{userId}.faiss")
    load_from_s3(userId + ".pkl", f"{file_path}/{userId}.pkl")

    db = FAISS.load_local(
        index_name=userId,
        folder_path=file_path,
        embeddings=embeddings,
        allow_dangerous_deserialization=True,
    )

    similarity_search_result = db.similarity_search(search_string, k=3)
    response = []
    for result in similarity_search_result:
        response.append(
            {
                "documentId": result.metadata["documentId"],
                "title": result.metadata["title"],
                "content": result.metadata["original_content"].decode("utf-8"),
            }
        )

    return {
        "statusCode": 200,
        "body": json.dumps(response),
    }

def load_from_s3(key, file_path):
    try:
        s3.download_file(Bucket=bucket_name, Key=key, Filename=file_path)
        return True
    except Exception as e:
        print(f"Error getting object from S3: {e}")
        return False
