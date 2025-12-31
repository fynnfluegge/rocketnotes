import json
import logging
import os

import boto3
from langchain.schema import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter

from rocketnotes_handler.lib.util import get_embeddings_model, get_user_config
from rocketnotes_handler.lib.vector_store_factory import (
    create_vector_store_from_documents, delete_document_vectors,
    get_vector_store_factory)

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

documents_table_name = "tnn-Documents"
vector_table_name = "tnn-Vectors"
userConfig_table_name = "tnn-UserConfig"


def handler(event, context):
    if is_local:
        event = json.loads(event["body"])
    message = event["Records"][0]["body"]
    if not is_local:
        message = json.loads(message)
    userId = message["userId"]
    documentId = message.get("documentId", None)
    documentIds = message.get("documentIds", [])
    recreateIndex = message.get("recreateIndex", False)
    deleteVectors = message.get("deleteVectors", False)

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

    try:
        # Get vector store for the user (S3 for prod, Chroma for local)
        vector_store = get_vector_store_factory(userId, embeddings)

        if deleteVectors:
            delete_document_vectors(documentId, vector_store)
        # Update single document vectors
        elif documentId and not recreateIndex:
            try:
                document = dynamodb.get_item(
                    TableName="tnn-Documents",
                    Key={"id": {"S": documentId}},
                )
                if "Item" not in document:
                    return {
                        "statusCode": 404,
                        "body": json.dumps("Item not found in DynamoDB table"),
                    }

                document = document["Item"]
                # Delete existing vectors for this document
                delete_document_vectors(documentId, vector_store)
                # Add updated vectors
                save_document_vectors(document, vector_store)
            except Exception as e:
                print(f"Error updating document vectors: {e}")

        # Update multiple document vectors
        elif documentIds and not recreateIndex:
            try:
                for documentId in documentIds:
                    document = dynamodb.get_item(
                        TableName="tnn-Documents",
                        Key={"id": {"S": documentId}},
                    )
                    if "Item" not in document:
                        return {
                            "statusCode": 404,
                            "body": json.dumps("Item not found in DynamoDB table"),
                        }

                    document = document["Item"]
                    # Delete existing vectors for this document
                    delete_document_vectors(documentId, vector_store)
                    # Add updated vectors
                    save_document_vectors(document, vector_store)
            except Exception as e:
                print(f"Error updating document vectors: {e}")


        # Recreate all vectors for all documents (or initial creation)
        elif recreateIndex:
            print("Recreating index for userId: ", userId)
            filter_expression = "userId = :user_value"
            expression_attribute_values = {
                ":user_value": {"S": userId},
            }

            # Execute the query
            result = dynamodb.query(
                TableName=documents_table_name,
                IndexName="userId-index",
                KeyConditionExpression=filter_expression,
                ExpressionAttributeValues=expression_attribute_values,
            )

            # Process the query results
            documents = result.get("Items", [])
            if documents:
                split_documents = []
                for document in documents:
                    try:
                        if document.get("deleted", {}).get("BOOL", False):
                            continue
                        elif document.get("content", {}).get("S") is None:
                            continue
                        elif len(document.get("content", {}).get("S").strip()) <= 12:
                            continue
                        else:
                            content = document["content"]["S"]
                            documentId = document["id"]["S"]
                            title = document["title"]["S"]
                            split_documents.extend(
                                split_document(content, documentId, title)
                            )
                    except Exception as e:
                        print(
                            f"Error processing document {document['id']['S']}: ", str(e)
                        )

                # Create new vector store with all documents
                if split_documents:
                    print(f"About to create vector store with {len(split_documents)} documents")
                    vector_store = create_vector_store_from_documents(
                        split_documents, userId, embeddings
                    )
                    print(f"Successfully completed create_vector_store_from_documents")
                else:
                    print("No split_documents found, skipping vector store creation")

    except Exception as e:
        print(f"Exception caught in handler: {str(e)}")
        print(f"Exception type: {type(e).__name__}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(f"Internal server error, {e}"),
        }

    print("About to return success response")
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps("Success"),
    }

def split_document(document, documentId, title):
    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]
    markdown_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on, strip_headers=False
    )
    md_header_splits = markdown_splitter.split_text(document)

    documents = []
    for splitted_document in md_header_splits:
        if (
            not splitted_document.page_content
            or len(splitted_document.page_content.strip()) <= 12
        ):
            continue

        document = Document(
            page_content=f"{title}\n{splitted_document.page_content}",
            metadata={
                "documentId": documentId,
                "title": title,
            },
        )
        documents.append(document)

    return documents

def save_document_vectors(document, vector_store):
    """Add document vectors to vector store (works for both S3 and Chroma)"""
    try:
        content = document["content"]["S"]
        documentId = document["id"]["S"]
        title = document["title"]["S"]
        print(f"Processing document: {documentId}, title: {title[:50]}...")
    except Exception as e:
        print(f"Error extracting document data: {e}")
        raise Exception("Error getting content from DynamoDB")

    document_splits = split_document(content, documentId, title)
    if not document_splits:
        raise Exception("Error splitting document")

    print(f"Adding {len(document_splits)} document splits to vector store")
    # Add documents to vector store (works for both S3 and Chroma)
    vector_store.add_documents(document_splits)
    print(f"Successfully added document vectors for: {documentId}")



