from typing import TypedDict

from langchain.embeddings.base import Embeddings
from langchain_core.language_models import BaseChatModel
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from rocketnotes_handler.lib.cluster import cluster_text_objects
from rocketnotes_handler.lib.insert import find_insert_position
from rocketnotes_handler.lib.merge import merge_document_clusters
from rocketnotes_handler.lib.model import (
    InsertSuggestion,
    NoteCluster,
    NoteSnippet,
    UserConfig,
)


class ClusteringState(TypedDict):
    input_objects: list[NoteSnippet]
    clusters: list[NoteCluster]
    merged_documents: list[NoteSnippet]
    insert_results: list[InsertSuggestion]
    min_cluster_size: int
    cluster_selection_epsilon: float
    embeddings: Embeddings
    user_config: UserConfig
    chat_model: BaseChatModel
    bucket_name: str


def clustering_node(state: ClusteringState) -> ClusteringState:
    clusters = cluster_text_objects(
        objects=state["input_objects"],
        min_cluster_size=state.get("min_cluster_size", 1),
        cluster_selection_epsilon=state.get("cluster_selection_epsilon", 0.1),
    )

    state["clusters"] = clusters

    return state


def merging_node(state: ClusteringState) -> ClusteringState:
    merged_documents = merge_document_clusters(
        document_clusters=state["clusters"], embeddings=state["embeddings"]
    )

    state["merged_documents"] = merged_documents

    return state


def find_insert_position_node(state: ClusteringState) -> ClusteringState:
    insert_results = find_insert_position(
        user_config=state["user_config"],
        embeddings=state["embeddings"],
        chat_model=state["chat_model"],
        notes=state["merged_documents"],
        bucket_name=state["bucket_name"],
    )

    state["insert_results"] = insert_results

    return state


def create_clustering_workflow():

    # Initialize the graph
    workflow = StateGraph(ClusteringState)

    # Add nodes
    workflow.add_node("clustering", clustering_node)
    workflow.add_node("merging", merging_node)
    workflow.add_node("find_insert_position", find_insert_position_node)

    # Define the flow
    workflow.set_entry_point("clustering")
    workflow.add_edge("clustering", "merging")
    workflow.add_edge("merging", "find_insert_position")
    workflow.add_edge("find_insert_position", END)

    # Compile the graph
    app = workflow.compile()
    return app


def run_clustering_workflow(
    graph: CompiledStateGraph,
    input_objects: list[NoteSnippet],
    embeddings: Embeddings,
    user_config: UserConfig,
    chat_model: BaseChatModel,
    bucket_name: str,
    min_cluster_size: int = 1,
    cluster_selection_epsilon: float = 0.1,
):
    # Initial state
    initial_state = {
        "input_objects": input_objects,
        "clusters": [],
        "merged_documents": [],
        "insert_results": [],
        "min_cluster_size": min_cluster_size,
        "cluster_selection_epsilon": cluster_selection_epsilon,
        "embeddings": embeddings,
        "user_config": user_config,
        "chat_model": chat_model,
        "bucket_name": bucket_name,
    }

    # Run the workflow
    final_state = graph.invoke(initial_state)

    return final_state["insert_results"]
