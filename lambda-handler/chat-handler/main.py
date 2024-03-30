import json
import os
from pathlib import Path

import boto3
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationSummaryMemory
from langchain_community.chat_models import ChatAnthropic
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

is_local = os.environ.get("LOCAL", False)
s3_args = {}

if is_local:
    s3_args["endpoint_url"] = "http://s3:9090"

s3 = boto3.client("s3", **s3_args)

documents_table_name = "tnn-Documents"
bucket_name = os.environ["BUCKET_NAME"]


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

    if "embeddingsModel" in request_body:
        embeddings_model = request_body["embeddingsModel"]
    else:
        return {"statusCode": 400, "body": "embeddings model is missing"}

    if "llmModel" in request_body:
        llm_model = request_body["llmModel"]
    else:
        return {"statusCode": 400, "body": "llm model is missing"}

    if "openAiApiKey" in request_body:
        os.environ["OPENAI_API_KEY"] = request_body["openAiApiKey"]

    if "anthropicApiKey" in request_body:
        os.environ["ANTHROPIC_API_KEY"] = request_body["anthropicApiKey"]

    if embeddings_model == "text-embedding-ada-002":
        embeddings = OpenAIEmbeddings(client=None, model="text-embedding-ada-002")
    else:
        embeddings = HuggingFaceEmbeddings(model=embeddings_model)

    file_path = f"/tmp/{userId}"
    Path(file_path).mkdir(parents=True, exist_ok=True)
    load_from_s3(userId + ".faiss", f"{file_path}/{userId}.faiss")
    load_from_s3(userId + ".pkl", f"{file_path}/{userId}.pkl")

    db = FAISS.load_local(
        index_name=userId,
        folder_path=file_path,
        embeddings=embeddings,
    )
    retriever = db.as_retriever(search_type="mmr", search_kwargs={"k": 8})

    if llm_model == "gpt-3.5-turbo":
        chat_model = ChatOpenAI(temperature=0.9, max_tokens=2048, model=llm_model)
    elif (
        llm_model == "claude-3-opus-20240229"
        or llm_model == "claude-3-sonnet-20240229"
        or llm_model == "claude-3-haiku-20240307"
    ):
        chat_model = ChatAnthropic(temperature=0.9, max_tokens=2048, model=llm_model)
    else:
        return {
            "statusCode": 400,
            "body": "Invalid LLM model. Please use one of the following models: gpt-3.5-turbo, claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307",
        }

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
