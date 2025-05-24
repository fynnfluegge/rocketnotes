import os

from langchain.embeddings.base import Embeddings
from langchain_anthropic import ChatAnthropic
from langchain_community.embeddings import (HuggingFaceEmbeddings,
                                            OllamaEmbeddings, VoyageEmbeddings)
from langchain_community.llms import Ollama
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_together import ChatTogether

from rocketnotes_handler.lib.model import UserConfig


def get_user_config(user_config) -> UserConfig:
    return  UserConfig(
        id=user_config["Item"].get("id", {}).get("S", None),
        embeddingsModel=user_config["Item"]
        .get("embeddingModel", {})
        .get("S", None),
        llm=user_config["Item"]
        .get("llm", {})
        .get("S", None),
        openAiApiKey=user_config["Item"]
        .get("openAiApiKey", {})
        .get("S", None),
        anthropicApiKey=user_config["Item"]
        .get("anthropicApiKey", {})
        .get("S", None),
        voyageApiKey=user_config["Item"]
        .get("voyageApiKey", {})
        .get("S", None),
        togetherApiKey=user_config["Item"]
        .get("togetherApiKey", {})
        .get("S", None),
    )

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
