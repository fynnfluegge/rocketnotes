import json
import os
from pathlib import Path

import boto3
from langchain_community.embeddings import (HuggingFaceEmbeddings,
                                            OllamaEmbeddings, VoyageEmbeddings)
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

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

    userConfig = dynamodb.get_item(
        TableName=userConfig_table_name,
        Key={"id": {"S": userId}},
    )

    if "Item" not in userConfig:
        return {
            "statusCode": 404,
            "body": json.dumps("User not found"),
        }

    userConfig = userConfig["Item"]

    if "embeddingModel" in userConfig:
        embeddings_model = userConfig.get("embeddingModel").get("S")
    else:
        return {"statusCode": 400, "body": "embeddings model is missing"}

    if embeddings_model == "text-embedding-ada-002":
        if "openAiApiKey" in userConfig:
            os.environ["OPENAI_API_KEY"] = userConfig.get("openAiApiKey").get("S")
        else:
            return {"statusCode": 400, "body": "OpenAI API key is missing"}
        embeddings = OpenAIEmbeddings(client=None, model=embeddings_model)
    elif embeddings_model == "voyage-2" or embeddings_model == "voyage-3":
        if "voyageApiKey" in userConfig:
            os.environ["VOYAGE_API_KEY"] = userConfig.get("voyageApiKey").get("S")
        else:
            return {"statusCode": 400, "body": "OpenAI API key is missing"}
        embeddings = VoyageEmbeddings(model=embeddings_model)
    elif embeddings_model == "Sentence-Transformers":
        embeddings = HuggingFaceEmbeddings(model_kwargs={"device": "cpu"})
    elif embeddings_model == "Ollama-nomic-embed-text":
        embeddings = OllamaEmbeddings(
            base_url="http://ollama:11434", model=embeddings_model.split("Ollama-")[1]
        )
    else:
        return {
            "statusCode": 400,
            "body": json.dumps("Embeddings model not found"),
        }

    file_path = f"/tmp/{userId}"
    Path(file_path).mkdir(parents=True, exist_ok=True)
    load_from_s3(userId + ".faiss", f"{file_path}/{userId}.faiss")
    load_from_s3(userId + ".pkl", f"{file_path}/{userId}.pkl")

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
