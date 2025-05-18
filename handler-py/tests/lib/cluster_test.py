import pytest

from rocketnotes_handler.lib.cluster import cluster_text_objects
from rocketnotes_handler.lib.model import NoteSnippet


@pytest.fixture
def sample_snippets():
    return [
        NoteSnippet(id="1", vector=[0.1, 0.2], text="Snippet 1"),
        NoteSnippet(id="2", vector=[0.15, 0.25], text="Snippet 2"),
        NoteSnippet(id="3", vector=[5.0, 5.0], text="Snippet 3"),
    ]


def test_empty_input():
    result = cluster_text_objects([])
    assert result == []


def test_single_cluster(sample_snippets):
    clusters = cluster_text_objects(
        sample_snippets, min_cluster_size=1, cluster_selection_epsilon=0.01
    )
    assert len(clusters) == 3
    assert len(clusters[0].members) == 1
    assert clusters[0].members[0].vector == sample_snippets[0].vector
    assert clusters[0].members[0].text == sample_snippets[0].text
    assert clusters[0].members[0].id == sample_snippets[0].id
    assert len(clusters[1].members) == 1
    assert clusters[1].members[0].vector == sample_snippets[1].vector
    assert clusters[1].members[0].text == sample_snippets[1].text
    assert clusters[1].members[0].id == sample_snippets[1].id
    assert len(clusters[2].members) == 1
    assert clusters[2].members[0].vector == sample_snippets[2].vector
    assert clusters[2].members[0].text == sample_snippets[2].text
    assert clusters[2].members[0].id == sample_snippets[2].id


def test_multiple_clusters(sample_snippets):
    clusters = cluster_text_objects(
        sample_snippets, min_cluster_size=1, cluster_selection_epsilon=0.1
    )
    assert len(clusters) == 2
    assert len(clusters[0].members) == 2
    assert len(clusters[1].members) == 1

    clusters = cluster_text_objects(
        sample_snippets, min_cluster_size=1, cluster_selection_epsilon=0.3
    )
    assert len(clusters) == 1
    assert len(clusters[0].members) == 3
