import numpy as np
from sklearn.cluster import DBSCAN

from .model import NoteCluster, NoteSnippet


def cluster_text_objects(
    objects: list[NoteSnippet], min_cluster_size=1, cluster_selection_epsilon=0.1
) -> list[NoteCluster]:
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
