from langchain.embeddings.base import Embeddings

from .model import NoteCluster, NoteSnippet


def merge_document_clusters(
    document_clusters: list[NoteCluster], embeddings: Embeddings
) -> list[NoteSnippet]:
    """
    Merges document clusters based on their similarity.

    Args:
        document_clusters (list): A list of document clusters, where each cluster is a list of documents.

    Returns:
        list: A new list of merged document clusters.
    """
    merged_documents = []
    for cluster in document_clusters:
        if len(cluster.members) == 1:
            # If the cluster has only one document, add it directly to merged_documents
            merged_documents.append(cluster.members[0])
        else:
            doc_texts = "\n\n".join(doc.text for doc in cluster.members)
            vector = embeddings.embed_query(doc_texts)
            merged_doc = NoteSnippet(
                ids=[doc.ids[0] for doc in cluster.members],
                vector=vector,
                text=doc_texts,
            )
            merged_documents.append(merged_doc)
    return merged_documents
