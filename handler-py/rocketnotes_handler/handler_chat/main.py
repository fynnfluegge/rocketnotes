import json
import os
from pathlib import Path

import boto3
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationSummaryMemory
from langchain_anthropic import ChatAnthropic
from langchain_community.embeddings import (
    HuggingFaceEmbeddings,
    OllamaEmbeddings,
    VoyageEmbeddings,
)
from langchain_community.llms import Ollama
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_together import ChatTogether

is_local = os.environ.get("LOCAL", False)
s3_args = {}
dynamodb_args = {}

if is_local:
    s3_args["endpoint_url"] = "http://s3:9090"
    dynamodb_args["endpoint_url"] = "http://dynamodb:8000"

s3 = boto3.client("s3", **s3_args)
dynamodb = boto3.client("dynamodb", **dynamodb_args)

userConfig_table_name = "tnn-UserConfig"
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
            "Based on the context provided, answer the following question in valid markdown syntax: "
            + request_body["prompt"]
        )
    else:
        return {"statusCode": 400, "body": "search_string is missing"}

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

    if "embeddingModel" in userConfig:
        embeddings_model = userConfig.get("embeddingModel").get("S")
    else:
        return {"statusCode": 400, "body": "embeddings model is missing"}

    try:
        embeddings = get_embeddings_model(embeddings_model, userConfig)
    except ValueError as e:
        return {
            "statusCode": 400,
            "body": json.dumps(str(e)),
        }

    if "llm" in userConfig:
        llm_model = userConfig.get("llm").get("S")
    else:
        return {"statusCode": 400, "body": "llm model is missing"}

    try:
        chat_model = get_chat_model(llm_model, userConfig)
    except ValueError as e:
        return {"statusCode": 400, "body": str(e)}

    file_path = f"/tmp/{userId}"
    Path(file_path).mkdir(parents=True, exist_ok=True)
    load_from_s3(userId + ".faiss", f"{file_path}/{userId}.faiss")
    load_from_s3(userId + ".pkl", f"{file_path}/{userId}.pkl")

    db = FAISS.load_local(
        index_name=userId,
        folder_path=file_path,
        embeddings=embeddings,
        allow_dangerous_deserialization=True,
    )

    retriever = db.as_retriever(search_type="similarity", search_kwargs={"k": 3})

    qa = ConversationalRetrievalChain.from_llm(chat_model, retriever=retriever)
    result = qa({"question": prompt, "chat_history": []})

    return {"statusCode": 200, "body": json.dumps(result["answer"])}


def load_from_s3(key, file_path):
    try:
        s3.download_file(Bucket=bucket_name, Key=key, Filename=file_path)
        return True
    except Exception as e:
        print(f"Error getting object from S3: {e}")
        return False


def get_embeddings_model(embeddings_model, userConfig):
    if embeddings_model == "text-embedding-ada-002":
        if "openAiApiKey" in userConfig:
            os.environ["OPENAI_API_KEY"] = userConfig.get("openAiApiKey").get("S")
        else:
            raise ValueError(f"OpenAI API key is missing for model {embeddings_model}")
        return OpenAIEmbeddings(client=None, model=embeddings_model)
    elif embeddings_model in ["voyage-2", "voyage-3"]:
        if "voyageApiKey" in userConfig:
            os.environ["VOYAGE_API_KEY"] = userConfig.get("voyageApiKey").get("S")
        else:
            raise ValueError(f"Voyage API key is missing for model {embeddings_model}")
        return VoyageEmbeddings(model=embeddings_model)
    elif embeddings_model == "Sentence-Transformers":
        return HuggingFaceEmbeddings(model_kwargs={"device": "cpu"})
    elif embeddings_model == "Ollama-nomic-embed-text":
        return OllamaEmbeddings(
            base_url="http://ollama:11434", model=embeddings_model.split("Ollama-")[1]
        )
    else:
        raise ValueError(f"Embeddings model '{embeddings_model}' not found")


def get_chat_model(llm_model, userConfig):
    if llm_model.startswith("gpt"):
        if "openAiApiKey" in userConfig:
            os.environ["OPENAI_API_KEY"] = userConfig.get("openAiApiKey").get("S")
        else:
            raise ValueError("OpenAI API key is missing")
        return ChatOpenAI(temperature=0.9, max_tokens=2048, model=llm_model)
    elif llm_model.startswith("claude"):
        if "anthropicApiKey" in userConfig:
            os.environ["ANTHROPIC_API_KEY"] = userConfig.get("anthropicApiKey").get("S")
        else:
            raise ValueError("Anthropic API key is missing")
        return ChatAnthropic(temperature=0.9, max_tokens=2048, model=llm_model)
    elif llm_model.startswith("together"):
        if "togetherApiKey" in userConfig:
            os.environ["TOGETHER_API_KEY"] = userConfig.get("togetherApiKey").get("S")
        else:
            raise ValueError("Together API key is missing")
        return ChatTogether(
            temperature=0.9, max_tokens=2048, model=llm_model.split("together-")[1]
        )
    elif llm_model.startswith("Ollama"):
        return Ollama(
            base_url="http://ollama:11434",
            model=llm_model.split("Ollama-")[1],
        )
    else:
        raise ValueError(
            "Invalid LLM model. Please use one of the following models: gpt-*, claude-*, Ollama-*"
        )
