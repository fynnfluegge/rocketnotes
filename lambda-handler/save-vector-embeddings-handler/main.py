import json
import os

import boto3
from langchain.text_splitter import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

s3 = boto3.client("s3")
dynamodb = boto3.client("dynamodb")

documents_table_name = "tnn-Documents"
vector_table_name = "tnn-Vectors"
bucket_name = os.environ["bucketName"]


def handler(event, context):
    sqs_message = event["Records"][0]["body"]
    print("Received message from SQS:", sqs_message)
    message = json.loads(sqs_message)
    userId = message["userId"]
    documentId = message["documentId"]
    openAiApiKey = message["openAiApiKey"]
    os.environ["OPENAI_API_KEY"] = openAiApiKey

    try:
        # Check if faiss vector present in dynamodb
        # ----------------------------------------
        filter_expression = "userId = :value"
        expression_attribute_values = {":value": {"S": userId}}

        result = dynamodb.query(
            TableName=vector_table_name,
            KeyConditionExpression=filter_expression,
            ExpressionAttributeValues=expression_attribute_values,
        )

        items = result.get("Items", [])

        print("Items:", items)

        # Vectors already exists, update the index
        # --------------------------------------------
        if items:
            faiss_index_snapshot = load_from_s3(userId)
            embeddings = OpenAIEmbeddings(client=None, model="text-embedding-ada-002")
            db = FAISS.deserialize_from_bytes(
                embeddings=embeddings, serialized=faiss_index_snapshot
            )
            # Get item from DynamoDB table
            document = dynamodb.get_item(
                TableName="tnn-Documents",
                Key={"primaryKey": {"S": documentId}},
            )
            # Check if item exists in the table
            if "Item" not in document:
                return {
                    "statusCode": 404,
                    "body": json.dumps("Item not found in DynamoDB table"),
                }

            document = document["Item"]
            print("Item retrieved:", document)

            vectors = dynamodb.get_item(
                TableName="tnn-Vectors",
                Key={"primaryKey": {"S": documentId}},
            )
            if "Item" in vectors:
                vectors = vectors["Item"]
                print("Item retrieved:", vectors)
                try:
                    db.delete(vectors)
                except Exception as e:
                    print(f"Error deleting vectors for file {documentId}: {e}")

            # Save vector embeddings to faiss index
            document_splits = split_document(document["content"])

            if not document_splits:
                return {
                    "statusCode": 500,
                    "body": json.dumps("Error splitting document"),
                }

            for document in document_splits:
                db.add_documents([document])

            save_to_s3(userId, db.serialize_to_bytes())

        else:
            # Faiss index does not exist, create the index from scratch
            # ---------------------------------------------------------
            filter_expression = "userId = :value"
            expression_attribute_values = {":value": {"S": userId}}

            # Execute the query
            result = dynamodb.query(
                TableName=documents_table_name,
                KeyConditionExpression=filter_expression,
                ExpressionAttributeValues=expression_attribute_values,
            )

            # Process the query results
            documents = result.get("Items", [])
            print("Documents:", documents)
            if documents:
                embeddings = OpenAIEmbeddings(
                    client=None, model="text-embedding-ada-002"
                )
                split_documents = []
                for document in documents:
                    print("Document:", document)
                    content = document["content"]
                    split_documents.extend(split_document(content))
                db = FAISS.from_documents(documents, embeddings)
                save_to_s3(userId, db.serialize_to_bytes())

    except Exception as e:
        print("Error:", e)
        return {"statusCode": 500, "body": json.dumps("Internal server error")}


def save_to_s3(userId, memory_snapshot):
    try:
        s3.put_object(Bucket=bucket_name, Key=userId + ".faiss", Body=memory_snapshot)
        return True
    except Exception as e:
        print(f"Error saving object to S3: {e}")


def load_from_s3(userId):
    try:
        response = s3.get_object(Bucket=bucket_name, Key=userId + ".faiss")
        object_data = response["Body"].read()
        return object_data
    except Exception as e:
        print(f"Error getting object from S3: {e}")
        return None


def split_document(document):
    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]
    markdown_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on, strip_headers=False
    )
    md_header_splits = markdown_splitter.split_text(document)

    chunk_size = 250
    chunk_overlap = 30
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    )

    return text_splitter.split_documents(md_header_splits)
