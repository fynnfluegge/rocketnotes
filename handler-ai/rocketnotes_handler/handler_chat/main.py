import json
import os
from uuid import UUID, uuid4

import boto3
from langchain.chains import ConversationalRetrievalChain

from rocketnotes_handler.lib.util import (
    get_chat_model,
    get_embeddings_model,
    get_user_config,
)
from rocketnotes_handler.lib.vector_store_factory import get_vector_store_factory
from rocketnotes_handler.lib.web_search import (
    WebSearchError,
    answer_from_web,
    web_search_enabled,
)

is_local = os.environ.get("LOCAL", "")


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

    if not isinstance(request_body, dict):
        return {"statusCode": 400, "body": json.dumps("Expected a JSON object")}

    search_context = request_body.get("searchContext", "notes")
    if search_context not in ("notes", "web"):
        return {"statusCode": 400, "body": json.dumps("Unknown search context")}
    if search_context == "web":
        if not web_search_enabled():
            return {"statusCode": 403, "body": json.dumps("Web search is disabled")}
        question = request_body.get("prompt")
        if (
            not isinstance(question, str)
            or not question.strip()
            or len(question) > 8000
        ):
            return {"statusCode": 400, "body": json.dumps("Invalid web question")}
        try:
            # API clients may omit this for a standalone run. Never cache it in Lambda.
            conversation_id = (
                str(UUID(request_body["conversationId"]))
                if ("conversationId" in request_body)
                else str(uuid4())
            )
        except (ValueError, TypeError, AttributeError):
            return {"statusCode": 400, "body": json.dumps("Invalid conversationId")}

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
    _s3, dynamodb = get_boto3_clients()

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

    if search_context == "web":
        if user_config.llm is None:
            return {"statusCode": 400, "body": json.dumps("LLM model is missing")}
        llm = get_chat_model(user_config)
        try:
            answer = answer_from_web(question, conversation_id, llm)
        except WebSearchError as exc:
            return {"statusCode": 503, "body": json.dumps(str(exc))}
        return {"statusCode": 200, "body": json.dumps(answer)}

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
