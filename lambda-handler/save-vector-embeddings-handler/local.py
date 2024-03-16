import json
import os
from pathlib import Path

import boto3
from langchain.schema import Document
from langchain.text_splitter import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

s3 = boto3.client("s3", endpoint_url="http://s3:9090")
dynamodb = boto3.client("dynamodb", endpoint_url="http://dynamodb:8000")

documents_table_name = "tnn-Documents"
vector_table_name = "tnn-Vectors"
bucket_name = os.environ["BUCKET_NAME"]


def handler(event, context):
    body = json.loads(event["body"])
    message = body["Records"][0]["body"]
    userId = message["userId"]
    documentId = message["documentId"]
    openAiApiKey = message["openAiApiKey"]
    os.environ["OPENAI_API_KEY"] = openAiApiKey

    if not openAiApiKey:
        return {
            "statusCode": 400,
            "body": json.dumps("openAiApiKey is missing"),
        }

    try:
        file_path = f"/tmp/{userId}"
        Path(file_path).mkdir(parents=True, exist_ok=True)
        faiss_index_exists = load_from_s3(
            f"{userId}.faiss", f"{file_path}/{userId}.faiss"
        )

        # Vectors already exists, update the index
        # --------------------------------------------
        if faiss_index_exists:
            embeddings = OpenAIEmbeddings(client=None, model="text-embedding-ada-002")

            load_from_s3(f"{userId}.pkl", f"{file_path}/{userId}.pkl")

            db = FAISS.load_local(
                index_name=userId,
                folder_path=file_path,
                embeddings=embeddings,
            )
            # Get item from DynamoDB table
            document = dynamodb.get_item(
                TableName="tnn-Documents",
                Key={"id": {"S": documentId}},
            )
            # Check if item exists in the table
            if "Item" not in document:
                return {
                    "statusCode": 404,
                    "body": json.dumps("Item not found in DynamoDB table"),
                }

            document = document["Item"]

            vectors = dynamodb.get_item(
                TableName="tnn-Vectors",
                Key={"id": {"S": documentId}},
            )
            # Delete outdated vectors from DynamoDB
            if "Item" in vectors:
                vectors = vectors["Item"]["vectors"]["SS"]
                try:
                    db.delete(vectors)
                except Exception as e:
                    print(f"Error deleting vectors for file {documentId}: {e}")

            # Save vector embeddings to faiss index
            try:
                content = document["content"]["S"]
                documentId = document["id"]["S"]
                title = document["title"]["S"]
            except Exception:
                return {
                    "statusCode": 500,
                    "body": json.dumps("Error getting content from DynamoDB"),
                }
            document_splits = split_document(content, documentId, title)

            if not document_splits:
                return {
                    "statusCode": 500,
                    "body": json.dumps("Error splitting document"),
                }

            document_vectors = {}
            for document in document_splits:
                db.add_documents([document])
                if document.metadata["documentId"] not in document_vectors:
                    document_vectors[document.metadata["documentId"]] = [
                        db.index_to_docstore_id[len(db.index_to_docstore_id) - 1]
                    ]
                else:
                    document_vectors[document.metadata["documentId"]].append(
                        db.index_to_docstore_id[len(db.index_to_docstore_id) - 1]
                    )

            file_name = "faiss_index.bin"
            db.save_local(index_name=file_name, folder_path=file_path)
            save_to_s3(userId + ".faiss", file_path + "/" + file_name + ".faiss")
            save_to_s3(userId + ".pkl", file_path + "/" + file_name + ".pkl")
            add_vectors_to_dynamodb(documentId, document_vectors[documentId])

        else:
            # Faiss index does not exist, create the index from scratch
            # ---------------------------------------------------------
            filter_expression = "userId = :value"
            expression_attribute_values = {":value": {"S": userId}}

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
                embeddings = OpenAIEmbeddings(
                    client=None, model="text-embedding-ada-002"
                )
                split_documents = []
                for document in documents:
                    try:
                        content = document["content"]["S"]
                        documentId = document["id"]["S"]
                        title = document["title"]["S"]
                    except Exception:
                        continue
                    split_documents.extend(split_document(content, documentId, title))
                db = FAISS.from_documents(split_documents, embeddings)
                file_path = f"/tmp/{userId}"
                file_name = "faiss_index.bin"
                Path(file_path).mkdir(parents=True, exist_ok=True)
                db.save_local(index_name=file_name, folder_path=file_path)
                save_to_s3(userId + ".faiss", file_path + "/" + file_name + ".faiss")
                save_to_s3(userId + ".pkl", file_path + "/" + file_name + ".pkl")
                index_to_docstore_id = db.index_to_docstore_id
                document_vectors = get_vectors_from_faiss_index(
                    split_documents, db, index_to_docstore_id
                )
                for documentId, vectors in document_vectors.items():
                    add_vectors_to_dynamodb(documentId, vectors)

    except Exception as e:
        print("Error:", e)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps("Internal server error"),
        }

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps("Success"),
    }


def save_to_s3(key, file_path):
    try:
        s3.upload_file(Filename=file_path, Bucket=bucket_name, Key=key)
    except Exception as e:
        print(f"Error saving object to S3: {e}")


def load_from_s3(key, file_path):
    try:
        s3.download_file(Bucket=bucket_name, Key=key, Filename=file_path)
        return True
    except Exception as e:
        return False


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

    chunk_size = 512
    chunk_overlap = 32
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    )

    # splitted_documents = text_splitter.split_documents(md_header_splits)

    documents = []
    for splitted_document in md_header_splits:
        document = Document(
            page_content=splitted_document.page_content,
            metadata={
                "documentId": documentId,
                "title": title,
            },
        )
        documents.append(document)

    return documents


def get_vectors_from_faiss_index(documents, db, index_to_docstore_id):
    document_vectors = {}
    for i in range(len(documents)):
        document = db.docstore.search(index_to_docstore_id[i])
        if document:
            if document.metadata["documentId"] not in document_vectors:
                document_vectors[document.metadata["documentId"]] = [
                    index_to_docstore_id[i]
                ]
            else:
                document_vectors[document.metadata["documentId"]].append(
                    index_to_docstore_id[i]
                )
    return document_vectors


def add_vectors_to_dynamodb(documentId, vectors):
    try:
        newItem = {"id": {}, "vectors": {}}
        newItem["id"]["S"] = documentId
        newItem["vectors"]["SS"] = vectors
        dynamodb.put_item(TableName=vector_table_name, Item=newItem)
    except Exception as e:
        print(f"Error adding vectors to DynamoDB: {e}")
        return False
    return True
