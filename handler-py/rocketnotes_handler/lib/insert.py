import os
import boto3
from langchain.embeddings.base import Embeddings
from langchain_core.language_models import BaseChatModel

from .model import InsertSuggestion, NoteSnippet, UserConfig
from .vector_store_factory import get_vector_store_factory

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
) -> list[InsertSuggestion]:

    # Get vector store for the user (S3 for prod, Chroma for local)
    db = get_vector_store_factory(user_config.id, embeddings)

    result: list[InsertSuggestion] = []
    for note in notes:
        similarity_search_result = db.similarity_search(note.text, k=5)
        search_result = []
        for item in similarity_search_result:
            document_id = item.metadata["documentId"]
            title = item.metadata["title"]

            # Extract original content from metadata _page_content by removing title prefix
            # _page_content format is: "{title}\n{original_content}"
            page_content = item.metadata.get("_page_content", "")
            if page_content.startswith(f"{title}\n"):
                content = page_content[len(title) + 1:]  # +1 for the newline
            else:
                # Fallback if format is different
                content = page_content

            search_result.append(
                {
                    "documentId": document_id,
                    "title": title,
                    "content": content,
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
                InsertSuggestion(
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
                InsertSuggestion(
                    id=first_item["documentId"],
                    documentTitle=first_item["title"],
                    content=note.text,
                    similaritySearchResult=first_item["content"],
                    zettelIds=note.ids,
                )
            )

    return result
