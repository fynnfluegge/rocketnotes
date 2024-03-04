import json
import os
from pathlib import Path

import boto3
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationSummaryMemory
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

s3 = boto3.client("s3")

documents_table_name = "tnn-Documents"
bucket_name = os.environ["bucketName"]


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
            request_body["prompt"]
            + "/nSummarize the context I provided and respond with valid markdown syntax."
        )
    else:
        return {"statusCode": 400, "body": "search_string is missing"}

    if "openAiApiKey" in request_body:
        os.environ["OPENAI_API_KEY"] = request_body["openAiApiKey"]
    else:
        return {"statusCode": 400, "body": "openAiApiKey is missing"}

    file_path = f"/tmp/{userId}"
    Path(file_path).mkdir(parents=True, exist_ok=True)
    load_from_s3(userId + ".faiss", f"{file_path}/{userId}.faiss")
    load_from_s3(userId + ".pkl", f"{file_path}/{userId}.pkl")

    embeddings = OpenAIEmbeddings(client=None, model="text-embedding-ada-002")
    db = FAISS.load_local(
        index_name=userId,
        folder_path=file_path,
        embeddings=embeddings,
    )
    retriever = db.as_retriever(search_type="mmr", search_kwargs={"k": 8})

    chat_model = ChatOpenAI(temperature=0.9, max_tokens=2048, model="gpt-3.5-turbo")
    memory = ConversationSummaryMemory(
        llm=chat_model, memory_key="chat_history", return_messages=True
    )
    qa = ConversationalRetrievalChain.from_llm(
        chat_model, retriever=retriever, memory=memory
    )
    result = qa(prompt)

    return {"statusCode": 200, "body": json.dumps(result["answer"])}


def load_from_s3(key, file_path):
    try:
        s3.download_file(Bucket=bucket_name, Key=key, Filename=file_path)
        return True
    except Exception as e:
        print(f"Error getting object from S3: {e}")
        return False
