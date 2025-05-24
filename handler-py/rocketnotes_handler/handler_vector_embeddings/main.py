import json
import os
from pathlib import Path

import boto3
from langchain.schema import Document
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import MarkdownHeaderTextSplitter

from rocketnotes_handler.lib.util import get_embeddings_model, get_user_config

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
bucket_name = os.environ["BUCKET_NAME"]


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
        file_path = f"/tmp/{userId}"
        file_name = "faiss_index"
        Path(file_path).mkdir(parents=True, exist_ok=True)
        faiss_index_exists = load_from_s3(
            f"{userId}.faiss",
            f"{file_path}/{file_name}.faiss",
        )

        if deleteVectors:
            db = load_faiss_index_from_s3(userId, file_path, file_name, embeddings)
            delete_document_vectors_from_faiss_index(documentId, db)
            delete_document_vectors_from_dynamodb(documentId)
            db.save_local(index_name=file_name, folder_path=file_path)
            save_to_s3(userId + ".faiss", file_path + "/" + file_name + ".faiss")
            save_to_s3(userId + ".pkl", file_path + "/" + file_name + ".pkl")
        # Vectors already exists and documentId present
        # Update only document vectors
        # --------------------------------------------
        elif faiss_index_exists and documentId and not recreateIndex:
            try:
                db = load_faiss_index_from_s3(userId, file_path, file_name, embeddings)
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
                delete_document_vectors_from_faiss_index(documentId, db)
                delete_document_vectors_from_dynamodb(documentId)
                save_document_vectors_to_faiss_index(document, db)
                db.save_local(index_name=file_name, folder_path=file_path)
                save_to_s3(userId + ".faiss", file_path + "/" + file_name + ".faiss")
                save_to_s3(userId + ".pkl", file_path + "/" + file_name + ".pkl")
            except Exception as e:
                print(f"Error updating document vectors: {e}")

        elif faiss_index_exists and documentIds and not recreateIndex:
            try:
                db = load_faiss_index_from_s3(userId, file_path, file_name, embeddings)
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
                    delete_document_vectors_from_faiss_index(documentId, db)
                    delete_document_vectors_from_dynamodb(documentId)
                    save_document_vectors_to_faiss_index(document, db)
                db.save_local(index_name=file_name, folder_path=file_path)
                save_to_s3(userId + ".faiss", file_path + "/" + file_name + ".faiss")
                save_to_s3(userId + ".pkl", file_path + "/" + file_name + ".pkl")
            except Exception as e:
                print(f"Error updating document vectors: {e}")


        # Faiss index does not exist or should be recreated
        # Recreate all vectors for all documents
        # ---------------------------------------------------------
        elif not faiss_index_exists or recreateIndex:
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
                db = FAISS.from_documents(split_documents, embeddings)
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
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(f"Internal server error, {e}"),
        }

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps("Success"),
    }


def load_faiss_index_from_s3(userId, file_path, file_name, embeddings):
    load_from_s3(
        f"{userId}.pkl",
        f"{file_path}/{file_name}.pkl",
    )
    return FAISS.load_local(
        index_name="faiss_index",
        folder_path=file_path,
        embeddings=embeddings,
        allow_dangerous_deserialization=True,
    )


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


def head_object_from_s3(key):
    try:
        response = s3.head_object(Bucket=bucket_name, Key=key)
        return response
    except Exception as e:
        return None


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
                "original_content": splitted_document.page_content.encode("utf-8"),
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


def save_document_vectors_to_faiss_index(document, db):
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
    add_vectors_to_dynamodb(documentId, document_vectors[documentId])


def delete_document_vectors_from_faiss_index(documentId, db):
    vectors = dynamodb.get_item(
        TableName="tnn-Vectors",
        Key={"id": {"S": documentId}},
    )
    if "Item" in vectors:
        vectors = vectors["Item"]["vectors"]["SS"]
        try:
            db.delete(vectors)
        except Exception as e:
            print(f"Error deleting vectors for file {documentId}: {e}")


def delete_document_vectors_from_dynamodb(documentId):
    try:
        dynamodb.delete_item(
            TableName="tnn-Vectors",
            Key={"id": {"S": documentId}},
        )
    except Exception as e:
        print(f"Error deleting vectors for file {documentId}: {e}")

