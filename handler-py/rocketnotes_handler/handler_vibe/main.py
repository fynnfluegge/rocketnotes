import json
import os

import boto3
from langchain.embeddings.base import Embeddings
from langchain_anthropic import ChatAnthropic
from langchain_community.embeddings import (HuggingFaceEmbeddings,
                                            OllamaEmbeddings, VoyageEmbeddings)
from langchain_community.llms import Ollama
from langchain_community.vectorstores import FAISS
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_together import ChatTogether

from rocketnotes_handler.lib.cluster import cluster_text_objects
from rocketnotes_handler.lib.insert import find_insert_position
from rocketnotes_handler.lib.merge import merge_document_clusters
from rocketnotes_handler.lib.model import NoteSnippet, UserConfig, Zettel

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
        user_id:str = event["pathParameters"]["userId"]
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

    user_config = UserConfig(
        id=user_id,
        embeddingsModel=user_config_search_result["Item"]
        .get("embeddingModel", {})
        .get("S", None),
        llm=user_config_search_result["Item"]
        .get("llm", {})
        .get("S", None),
        openAiApiKey=user_config_search_result["Item"]
        .get("openAiApiKey", {})
        .get("S", None),
        anthropicApiKey=user_config_search_result["Item"]
        .get("anthropicApiKey", {})
        .get("S", None),
        voyageApiKey=user_config_search_result["Item"]
        .get("voyageApiKey", {})
        .get("S", None),
        togetherApiKey=user_config_search_result["Item"]
        .get("togetherApiKey", {})
        .get("S", None),
    )

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

    note_clusters = cluster_text_objects(note_snippets)

    merged_documents = merge_document_clusters(note_clusters, embeddings)

    reponse = find_insert_position(
        user_config=user_config,
        embeddings=embeddings,
        chat_model=llm,
        notes=merged_documents,
        bucket_name=bucket_name,
    )

    return {"statusCode": 200, "body": json.dumps([obj.to_dict() for obj in reponse])}


def get_embeddings_model(user_config: UserConfig) -> Embeddings:
    if user_config.embeddingsModel == "text-embedding-ada-002" or user_config.embeddingsModel == "text-embedding-3-small":
        if user_config.openAiApiKey:
            os.environ["OPENAI_API_KEY"] = user_config.openAiApiKey
        else:
            raise ValueError(
                f"OpenAI API key is missing for model {user_config.embeddingsModel}"
            )
        return OpenAIEmbeddings(client=None, model=user_config.embeddingsModel)
    elif user_config.embeddingsModel in ["voyage-2", "voyage-3"]:
        if user_config.voyageApiKey:
            os.environ["VOYAGE_API_KEY"] = user_config.voyageApiKey
        else:
            raise ValueError(
                f"Voyage API key is missing for model {user_config.embeddingsModel}"
            )
        return VoyageEmbeddings(model=user_config.embeddingsModel, batch_size=1)
    elif user_config.embeddingsModel == "Sentence-Transformers":
        return HuggingFaceEmbeddings(model_kwargs={"device": "cpu"})
    elif user_config.embeddingsModel == "Ollama-nomic-embed-text":
        return OllamaEmbeddings(
            base_url="http://ollama:11434",
            model=user_config.embeddingsModel.split("Ollama-")[1],
        )
    else:
        raise ValueError(f"Embeddings model '{user_config.embeddingsModel}' not found")


def get_chat_model(userConfig: UserConfig) -> BaseChatModel:
    if userConfig.llm is None:
        raise ValueError("LLM is missing")
    if userConfig.llm.startswith("gpt-"):
        if userConfig.openAiApiKey:
            os.environ["OPENAI_API_KEY"] = userConfig.openAiApiKey
        else:
            raise ValueError("OpenAI API key is missing")
        return ChatOpenAI(
            temperature=0.9, max_completion_tokens=2048, model=userConfig.llm
        )
    elif userConfig.llm.startswith("claude-"):
        if userConfig.anthropicApiKey:
            os.environ["ANTHROPIC_API_KEY"] = userConfig.anthropicApiKey
        else:
            raise ValueError("Anthropic API key is missing")
        return ChatAnthropic(
            temperature=0.9,
            max_tokens_to_sample=2048,
            model_name=userConfig.llm,
            timeout=60,
            stop=None,
        )
    elif userConfig.llm.startswith("together-"):
        if userConfig.togetherApiKey:
            os.environ["TOGETHER_API_KEY"] = userConfig.togetherApiKey
        else:
            raise ValueError("Together API key is missing")
        return ChatTogether(
            temperature=0.9, max_tokens=2048, model=userConfig.llm.split("together-")[1]
        )
    elif userConfig.llm.startswith("Ollama"):
        return Ollama(
            base_url="http://ollama:11434",
            model=userConfig.llm.split("Ollama-")[1],
        )
    else:
        raise ValueError(
            "Invalid LLM model. Please use one of the following models: gpt-*, claude-*, Ollama-*"
        )
