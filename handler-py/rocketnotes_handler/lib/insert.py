import os
from pathlib import Path

import boto3
from langchain.embeddings.base import Embeddings
from langchain_community.vectorstores import FAISS
from langchain_core.language_models import BaseChatModel

from .model import AgenticResult, NoteSnippet, UserConfig

is_local = os.environ.get("LOCAL", False)
s3_args = {}

if is_local:
    s3_args["endpoint_url"] = "http://s3:9090"

s3 = boto3.client("s3", **s3_args)


def find_insert_position(
    user_config: UserConfig,
    embeddings: Embeddings,
    chat_model: BaseChatModel,
    notes: list[NoteSnippet],
    bucket_name: str,
) -> list[AgenticResult]:

    file_path = f"/tmp/{user_config.id}"
    Path(file_path).mkdir(parents=True, exist_ok=True)
    load_from_s3(
        user_config.id + ".faiss", f"{file_path}/{user_config.id}.faiss", bucket_name
    )
    load_from_s3(
        user_config.id + ".pkl", f"{file_path}/{user_config.id}.pkl", bucket_name
    )

    db = FAISS.load_local(
        index_name=user_config.id,
        folder_path=file_path,
        embeddings=embeddings,
        allow_dangerous_deserialization=True,
    )

    result: list[AgenticResult] = []
    for note in notes:
        similarity_search_result = db.similarity_search(note.text, k=5)
        search_result = []
        for item in similarity_search_result:
            search_result.append(
                {
                    "documentId": item.metadata["documentId"],
                    "title": item.metadata["title"],
                    "content": item.metadata["original_content"].decode("utf-8"),
                }
            )

        search_results_formatted = "\n".join(
            f"{doc['documentId']}: {doc['content'][:512]}" for doc in search_result
        )
        chat_model_response = chat_model.invoke(
            f"Given the following search results, which one is the most relevant to the note content? Respond only with the documentId of the most relevant document.\n\n"
            + f"Note: {note.text}\n\n"
            + f"Search Results:\n{search_results_formatted}"
        )

        matched_item = next(
            (
                item
                for item in search_result
                if item["documentId"] in chat_model_response.content
            ),
            None,
        )
        if matched_item:
            result.append(
                AgenticResult(
                    id=matched_item["documentId"],
                    documentTitle=matched_item["title"],
                    content=note.text,
                    similaritySearchResult=matched_item["content"],
                    zettelIds=note.ids,
                )
            )
        elif search_result:
            first_item = search_result[0]
            result.append(
                AgenticResult(
                    id=first_item["documentId"],
                    documentTitle=first_item["title"],
                    content=note.text,
                    similaritySearchResult=first_item["content"],
                    zettelIds=note.ids,
                )
            )

    return result


def load_from_s3(key, file_path, bucket_name):
    try:
        s3.download_file(Bucket=bucket_name, Key=key, Filename=file_path)
        return True
    except Exception as e:
        print(f"Error getting object from S3: {e}")
        return False
