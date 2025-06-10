import json
import os

import boto3

from rocketnotes_handler.lib.graph import run_clustering_workflow
from rocketnotes_handler.lib.model import NoteSnippet, Zettel
from rocketnotes_handler.lib.util import (get_chat_model, get_embeddings_model,
                                          get_user_config)

is_local = os.environ.get("LOCAL", False)
s3_args = {}
dynamodb_args = {}

if is_local:
    s3_args["endpoint_url"] = "http://s3:9090"
    dynamodb_args["endpoint_url"] = "http://dynamodb:8000"

s3 = boto3.client("s3", **s3_args)
dynamodb = boto3.client("dynamodb", **dynamodb_args)

documents_table_name = "tnn-Documents"
vector_table_name = "tnn-Vectors"
userConfig_table_name = "tnn-UserConfig"
zettel_table_name = "tnn-Zettelkasten"
bucket_name = os.environ["BUCKET_NAME"]


def handler(event, context):

    if "pathParameters" in event and "userId" in event["pathParameters"]:
        user_id: str = event["pathParameters"]["userId"]
    else:
        return {"statusCode": 400, "body": "userId is missing in the URL path"}

    user_config_search_result = dynamodb.get_item(
        TableName=userConfig_table_name,
        Key={"id": {"S": user_id}},
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

    arguments = {
        "TableName": zettel_table_name,
        "IndexName": "userId-index",
        "KeyConditionExpression": f"userId = :V1",
        "ExpressionAttributeValues": {":V1": {"S": user_id}},
    }
    zettel_query_result = dynamodb.query(**arguments)

    items: list[Zettel] = []
    for item in zettel_query_result.get("Items", []):
        try:
            zettel = Zettel(
                id=item.get("id", {}).get("S", None),
                userId=item.get("userId", {}).get("S", None),
                content=item.get("content", {}).get("S", None),
            )
            items.append(zettel)
        except Exception as e:
            print(f"Error processing item: {e}")

    note_snippets: list[NoteSnippet] = []
    for item in items:
        vector = embeddings.embed_query(item.content)
        note_snippets.append(
            NoteSnippet(
                ids=[item.id],
                vector=vector,
                text=item.content,
            )
        )

    try:
        result = run_clustering_workflow(
            input_objects=note_snippets,
            embeddings=embeddings,
            user_config=user_config,
            chat_model=llm,
            bucket_name=bucket_name,
            min_cluster_size=1,
            cluster_selection_epsilon=0.1,
        )

        return {
            "statusCode": 200,
            "body": json.dumps([obj.to_dict() for obj in result]),
        }

    except Exception as e:
        print(f"Error running workflow: {e}")
        print(
            "Make sure to implement the required methods and classes with your actual logic"
        )
