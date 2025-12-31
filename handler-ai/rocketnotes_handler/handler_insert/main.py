import json
import math
import os
import re

import boto3

from rocketnotes_handler.lib.model import InsertSuggestion
from rocketnotes_handler.lib.util import get_user_config

is_local = os.environ.get("LOCAL", False)
s3_args = {}
dynamodb_args = {}
sqs_args = {}

if is_local:
    s3_args["endpoint_url"] = "http://s3:9090"
    dynamodb_args["endpoint_url"] = "http://dynamodb:8000"

s3 = boto3.client("s3", **s3_args)
dynamodb = boto3.client("dynamodb", **dynamodb_args)
sqs = boto3.client("sqs", **sqs_args)

documents_table_name = "tnn-Documents"
userConfig_table_name = "tnn-UserConfig"
zettel_table_name = "tnn-Zettelkasten"
queue_url = os.environ["QUEUE_URL"]


def handler(event, context):

    user_id = event["pathParameters"]["userId"]

    body = json.loads(event["body"])
    input = [
        InsertSuggestion(
            id=item["documentId"],
            documentTitle=item["documentTitle"],
            content=item["content"],
            similaritySearchResult=item["similaritySearchResult"],
            zettelIds=item.get("zettelIds", []),
        )
        for item in body
    ]

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

    zettel_ids_to_delete = []
    for item in input:
        document_search_result = dynamodb.get_item(
            TableName=documents_table_name,
            Key={"id": {"S": item.documentId}},
        )

        document_content = (
            document_search_result["Item"].get("content", {}).get("S", None)
        )
        title = document_search_result["Item"].get("title", {}).get("S", None)

        if item.similaritySearchResult in document_content:
            for zettelIds in item.zettelIds:
                for ids in zettelIds:
                    for id in ids:
                        zettel_ids_to_delete.append(id)
            document_content = document_content.replace(
                item.similaritySearchResult,
                item.similaritySearchResult + "\n\n" + item.content + "\n",
            )
        else:
            result = find_normalized_substring(document_content, item.similaritySearchResult)
            if result:
                end = result["end"]
                if end:
                    for zettelIds in item.zettelIds:
                            for ids in zettelIds:
                                for id in ids:
                                    zettel_ids_to_delete.append(id)
                    document_content = document_content[:end] + "\n" + item.content + "\n" + document_content[end:]

        document_search_content = (title + "\n" + document_content).lower()

        try:
            dynamodb.update_item(
                TableName=documents_table_name,
                Key={"id": {"S": item.documentId}},
                UpdateExpression="SET content = :content, title = :title, scearchContent = :searchContent",
                ExpressionAttributeValues={
                    ":content": {"S": document_content},
                    ":title": {"S": item.documentTitle},
                    ":searchContent": {"S": document_search_content},
                },
            )
        except Exception as e:
            print(f"Error updating document: {e}")
            return {
                "statusCode": 500,
                "body": json.dumps("Error updating document"),
            }


    message = {
        "userId": user_id,
        "documentIds": [item.documentId for item in input],
    }

    try:
        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(message),
            DelaySeconds=0,
        )
    except Exception as e:
        print(f"Error sending message to SQS: {e}")

    try:
        delete_requests = [
            {
                "DeleteRequest": {
                    "Key": {
                        "id": {"S": zettel_id},
                    }
                }
            }
            for zettel_id in zettel_ids_to_delete
        ]
        dynamodb.batch_write_item(
            RequestItems={
                zettel_table_name: delete_requests
            }
        )
    except Exception as e:
        print(f"Error getting zettelIds: {e}")


    return {
        "statusCode": 200,
    }

def find_normalized_substring(text, query):
    # Normalize: remove all whitespace (spaces, tabs, newlines)
    normalize = lambda s: re.sub(r'\s+', '', s)
    text_normalized = normalize(text)
    query_normalized = normalize(query)

    # Find fuzzy match position in normalized text
    start_pos = text_normalized.find(query_normalized)
    if start_pos == -1:
        return None  # Not found

    # Now map the position back to the original text
    original_pos = 0
    stripped_pos = 0
    match_start = -1
    match_end = -1

    for i, char in enumerate(text):
        if not char.isspace():
            if stripped_pos == start_pos:
                match_start = i
            if stripped_pos == start_pos + len(query_normalized) - 1:
                match_end = i
                break
            stripped_pos += 1
        original_pos += 1

    return {
        'start': match_start,
        'end': match_end + 1,  # exclusive
        'match': text[match_start:match_end + 1]
    }
