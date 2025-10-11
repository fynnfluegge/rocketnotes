import json
import os
import boto3
from langchain.chains import ConversationalRetrievalChain

from rocketnotes_handler.lib.util import (get_chat_model, get_embeddings_model,
                                          get_user_config)
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

    if "prompt" in request_body:
        prompt = (
            "Based on the context provided, answer the following question and respond in markdown format: "
            + request_body["prompt"]
            + "\n\nDon't return a markdown code block, just return the answer in markdown syntax."
        )
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

    if user_config.llm is None:
        return {
            "statusCode": 400,
            "body": json.dumps("LLM model is missing"),
        }
    else:
        llm = get_chat_model(user_config)

    # Get vector store for the user (S3 for prod, Chroma for local)
    db = get_vector_store_factory(userId, embeddings)

    retriever = db.as_retriever(search_type="similarity", search_kwargs={"k": 3})

    qa = ConversationalRetrievalChain.from_llm(llm, retriever=retriever)
    result = qa({"question": prompt, "chat_history": []})

    return {"statusCode": 200, "body": json.dumps(result["answer"])}
