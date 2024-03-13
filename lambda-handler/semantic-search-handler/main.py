import json
import os
from pathlib import Path

import boto3
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

s3 = boto3.client("s3")

documents_table_name = "tnn-Documents"
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

    if "openAiApiKey" in request_body:
        os.environ["OPENAI_API_KEY"] = request_body["openAiApiKey"]
    else:
        return {"statusCode": 400, "body": "openAiApiKey is missing"}

    file_path = f"/tmp/{userId}"
    Path(file_path).mkdir(parents=True, exist_ok=True)
    load_from_s3(userId + ".faiss", f"{file_path}/{userId}.faiss")
    load_from_s3(userId + ".pkl", f"{file_path}/{userId}.pkl")

    embeddings = OpenAIEmbeddings(client=None, model="text-embedding-ada-002")
    db = FAISS.load_local(
        index_name=userId,
        folder_path=file_path,
        embeddings=embeddings,
    )

    similarity_search_result = db.similarity_search(search_string, k=4)
    response = []
    for result in similarity_search_result:
        response.append(
            {
                "documentId": result.metadata["documentId"],
                "title": result.metadata["title"],
                "content": result.page_content,
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
