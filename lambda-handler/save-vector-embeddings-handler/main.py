import json
import os
from pathlib import Path

import boto3
from langchain.schema import Document
from langchain.text_splitter import (MarkdownHeaderTextSplitter,
                                     RecursiveCharacterTextSplitter)
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
    recreateIndex = message.get("recreateIndex", False)
    deleteVectors = message.get("deleteVectors", False)

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
    embeddingsModel = userConfig.get("embeddingModel", {}).get("S", None)
    openAiApiKey = userConfig.get("openAiApiKey", {}).get("S", None)
    voyageApiKey = userConfig.get("voyageApiKey", {}).get("S", None)
    if openAiApiKey is not None:
        os.environ["OPENAI_API_KEY"] = openAiApiKey
    if voyageApiKey is not None:
        os.environ["VOYAGE_API_KEY"] = voyageApiKey

    if embeddingsModel == "text-embedding-ada-002":
        if openAiApiKey is None:
            return {
                "statusCode": 400,
                "body": json.dumps("OpenAI API key not found"),
            }
        embeddings = OpenAIEmbeddings(client=None, model=embeddingsModel)
    elif embeddingsModel == "voyage-2" or embeddingsModel == "voyage-3":
        if voyageApiKey is None:
            return {
                "statusCode": 400,
                "body": json.dumps("Voyage API key not found"),
            }
        embeddings = VoyageEmbeddings(model=embeddingsModel)
    elif embeddingsModel == "Sentence-Transformers":
        embeddings = HuggingFaceEmbeddings(model_kwargs={"device": "cpu"})
    elif embeddingsModel == "Ollama-nomic-embed-text":
        embeddings = OllamaEmbeddings(
            base_url="http://ollama:11434", model=embeddingsModel.split("Ollama-")[1]
        )
    else:
        return {
            "statusCode": 400,
            "body": json.dumps("Embeddings model not found"),
        }

    try:
        file_path = f"/tmp/{userId}"
        file_name = "faiss_index"
        Path(file_path).mkdir(parents=True, exist_ok=True)
        faiss_index_exists = load_from_s3(
            f"{userId}.faiss",
            f"{file_path}/{file_name}.faiss",
        )

        # Vectors already exists and documentId present
        # Update only document vectors
        # --------------------------------------------
        if faiss_index_exists and documentId and not recreateIndex:
            try:
                load_from_s3(
                    f"{userId}.pkl",
                    f"{file_path}/{file_name}.pkl",
                )
                print("Updating document vectors for documentId: ", documentId)
                db = FAISS.load_local(
                    index_name="faiss_index",
                    folder_path=file_path,
                    embeddings=embeddings,
                )
                # Update any document vectors that have changed since last index creation
                # if recreateIndex:
                #     metadata = head_object_from_s3(f"{embeddingsModel}_{userId}.faiss")
                #     if metadata:
                #         last_modified = metadata["LastModified"]
                #         documents = dynamodb.scan(
                #             TableName="tnn-Documents",
                #             FilterExpression="userId = :userId",
                #             ExpressionAttributeValues={":userId": {"S": userId}},
                #         )
                #         for document in documents["Items"]:
                #             if document["lastModified"]["S"] > last_modified:
                #                 documentId = document["id"]["S"]
                #                 delete_document_vectors_from_faiss_index(documentId, db)
                #                 save_document_vectors_to_faiss_index(document, db)
                # else:
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
                delete_document_vectors_from_faiss_index(documentId, db)
                save_document_vectors_to_faiss_index(document, db)
                db.save_local(index_name=file_name, folder_path=file_path)
                save_to_s3(userId + ".faiss", file_path + "/" + file_name + ".faiss")
                save_to_s3(userId + ".pkl", file_path + "/" + file_name + ".pkl")
                # TODO update vectors to dynamodb
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
        else:
            # TODO in this case a document has been deleted
            # delete vectors for documentId
            pass

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
