from dataclasses import dataclass
from typing import List, TypedDict

import numpy as np
from langchain.embeddings.base import Embeddings
from langgraph.graph import END, StateGraph
from sklearn.cluster import DBSCAN

from rocketnotes_handler.lib.model import NoteCluster, NoteSnippet, Zettel


# Define the state structure
class ClusteringState(TypedDict):
    input_objects: List[NoteSnippet]
    clusters: List[NoteCluster]
    merged_documents: List[NoteSnippet]
    min_cluster_size: int
    cluster_selection_epsilon: float
    embeddings: Embeddings

# Your clustering function
def cluster_text_objects(
    objects: List[NoteSnippet], min_cluster_size=1, cluster_selection_epsilon=0.1
) -> List[NoteCluster]:
    """
    Clusters a list of objects based on their embedding vectors.

    Args:
        objects (list): List of objects, each with 'id', 'vector', and 'text' attributes or keys.
        min_cluster_size (int): Minimum size of clusters.

    Returns:
        list of list of objects: Each sublist is a cluster containing the original objects.
    """
    if not objects:
        return []

    # Extract vectors
    vectors = np.array([obj.vector for obj in objects])
    vectors = vectors / np.linalg.norm(vectors, axis=1, keepdims=True)

    # Cluster using DBSCAN
    clustering = DBSCAN(
        eps=cluster_selection_epsilon, min_samples=1, metric="euclidean"
    )
    labels = clustering.fit_predict(vectors)

    # Group points by label
    clusters = {}
    for idx, label in enumerate(labels):
        snippet = objects[idx]  # Retrieve the correct NoteSnippet object
        clusters.setdefault(label, []).append(snippet)

    result = []

    for cluster_id, snippets in clusters.items():
        result.append(NoteCluster(members=snippets))

    return result

# Your merging function
def merge_document_clusters(
    document_clusters: List[NoteCluster], embeddings: Embeddings
) -> List[NoteSnippet]:
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

# LangGraph node functions
def clustering_node(state: ClusteringState) -> ClusteringState:
    """First state: Cluster text objects"""
    print("Starting clustering process...")
    
    clusters = cluster_text_objects(
        objects=state["input_objects"],
        min_cluster_size=state.get("min_cluster_size", 1),
        cluster_selection_epsilon=state.get("cluster_selection_epsilon", 0.1)
    )
    
    state["clusters"] = clusters
    print(f"Created {len(clusters)} clusters")
    
    return state

def merging_node(state: ClusteringState) -> ClusteringState:
    """Second state: Merge document clusters"""
    print("Starting merging process...")
    
    merged_documents = merge_document_clusters(
        document_clusters=state["clusters"],
        embeddings=state["embeddings"]
    )
    
    state["merged_documents"] = merged_documents
    print(f"Merged into {len(merged_documents)} documents")
    
    return state

# Create the LangGraph workflow
def create_clustering_workflow():
    """Create and return the compiled LangGraph workflow"""
    
    # Initialize the graph
    workflow = StateGraph(ClusteringState)
    
    # Add nodes
    workflow.add_node("clustering", clustering_node)
    workflow.add_node("merging", merging_node)
    
    # Define the flow
    workflow.set_entry_point("clustering")
    workflow.add_edge("clustering", "merging")
    workflow.add_edge("merging", END)
    
    # Compile the graph
    app = workflow.compile()
    return app

# Example usage
def run_clustering_workflow(
    input_objects: List[NoteSnippet],
    embeddings: Embeddings,
    min_cluster_size: int = 1,
    cluster_selection_epsilon: float = 0.1
):
    """Run the complete clustering workflow"""
    
    # Create the workflow
    app = create_clustering_workflow()
    
    # Initial state
    initial_state = {
        "input_objects": input_objects,
        "clusters": [],
        "merged_documents": [],
        "min_cluster_size": min_cluster_size,
        "cluster_selection_epsilon": cluster_selection_epsilon,
        "embeddings": embeddings
    }
    
    # Run the workflow
    final_state = app.invoke(initial_state)
    
    return final_state["merged_documents"]
