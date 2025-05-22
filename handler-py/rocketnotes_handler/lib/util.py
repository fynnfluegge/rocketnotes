import os

from langchain_anthropic import ChatAnthropic
from langchain_community.embeddings import (
    HuggingFaceEmbeddings,
    OllamaEmbeddings,
    VoyageEmbeddings,
)
from langchain_community.llms import Ollama
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_together import ChatTogether


def get_embeddings_model(embeddings_model, userConfig):
    if (
        embeddings_model == "text-embedding-ada-002"
        or embeddings_model == "text-embedding-3-small"
    ):
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
