from typing import TypedDict

from langchain.embeddings.base import Embeddings
from langchain_core.language_models import BaseChatModel
from langgraph.graph import END, StateGraph

from rocketnotes_handler.lib.cluster import cluster_text_objects
from rocketnotes_handler.lib.insert import find_insert_position
from rocketnotes_handler.lib.merge import merge_document_clusters
from rocketnotes_handler.lib.model import (
    AgenticResult,
    NoteCluster,
    NoteSnippet,
    UserConfig,
)


class ClusteringState(TypedDict):
    input_objects: list[NoteSnippet]
    clusters: list[NoteCluster]
    merged_documents: list[NoteSnippet]
    agentic_results: list[AgenticResult]
    min_cluster_size: int
    cluster_selection_epsilon: float
    embeddings: Embeddings
    user_config: UserConfig
    chat_model: BaseChatModel
    bucket_name: str


def clustering_node(state: ClusteringState) -> ClusteringState:
    """First state: Cluster text objects"""
    print("Starting clustering process...")

    clusters = cluster_text_objects(
        objects=state["input_objects"],
        min_cluster_size=state.get("min_cluster_size", 1),
        cluster_selection_epsilon=state.get("cluster_selection_epsilon", 0.1),
    )

    state["clusters"] = clusters
    print(f"Created {len(clusters)} clusters")

    return state


def merging_node(state: ClusteringState) -> ClusteringState:
    """Second state: Merge document clusters"""
    print("Starting merging process...")

    merged_documents = merge_document_clusters(
        document_clusters=state["clusters"], embeddings=state["embeddings"]
    )

    state["merged_documents"] = merged_documents
    print(f"Merged into {len(merged_documents)} documents")

    return state


def find_insert_position_node(state: ClusteringState) -> ClusteringState:
    """Third state: Find insert positions for merged documents"""
    print("Starting find insert position process...")

    agentic_results = find_insert_position(
        user_config=state["user_config"],
        embeddings=state["embeddings"],
        chat_model=state["chat_model"],
        notes=state["merged_documents"],
        bucket_name=state["bucket_name"],
    )

    state["agentic_results"] = agentic_results
    print(f"Generated {len(agentic_results)} agentic results")

    return state


# Create the LangGraph workflow
def create_clustering_workflow():
    """Create and return the compiled LangGraph workflow"""

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
    input_objects: list[NoteSnippet],
    embeddings: Embeddings,
    user_config: UserConfig,
    chat_model: BaseChatModel,
    bucket_name: str,
    min_cluster_size: int = 1,
    cluster_selection_epsilon: float = 0.1,
):
    """Run the complete clustering workflow"""

    # Create the workflow
    app = create_clustering_workflow()

    # Initial state
    initial_state = {
        "input_objects": input_objects,
        "clusters": [],
        "merged_documents": [],
        "agentic_results": [],
        "min_cluster_size": min_cluster_size,
        "cluster_selection_epsilon": cluster_selection_epsilon,
        "embeddings": embeddings,
        "user_config": user_config,
        "chat_model": chat_model,
        "bucket_name": bucket_name,
    }

    # Run the workflow
    final_state = app.invoke(initial_state)

    return final_state["agentic_results"]
