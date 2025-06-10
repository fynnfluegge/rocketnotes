class NoteSnippet:
    def __init__(self, vector: list[float], text: str, ids: list[str] = []):
        self.ids: list[str] = ids
        self.vector: list[float] = vector
        self.text: str = text


class NoteCluster:
    def __init__(self, members: list[NoteSnippet]):
        self.members: list[NoteSnippet] = members


class UserConfig:
    def __init__(
        self,
        id: str,
        embeddingsModel: str | None = None,
        llm: str | None = None,
        openAiApiKey: str | None = None,
        anthropicApiKey: str | None = None,
        voyageApiKey: str | None = None,
        togetherApiKey: str | None = None,
    ):
        self.id: str = id
        self.embeddingsModel: str | None = embeddingsModel
        self.llm: str | None = llm
        self.openAiApiKey: str | None = openAiApiKey
        self.anthropicApiKey: str | None = anthropicApiKey
        self.voyageApiKey: str | None = voyageApiKey
        self.togetherApiKey: str | None = togetherApiKey


class Zettel:
    def __init__(self, id: str, userId: str, content: str):
        self.id: str = id
        self.userId: str = userId
        self.content: str = content


class AgenticResult:
    def __init__(
        self,
        id: str,
        documentTitle: str,
        content: str,
        similaritySearchResult: str,
        zettelIds: list[str] | None,
    ):
        self.documentId: str = id
        self.documentTitle: str = documentTitle
        self.content: str = content
        self.similaritySearchResult: str = similaritySearchResult
        if zettelIds is None:
            zettelIds = []
        self.zettelIds: list[str] = zettelIds

    def to_dict(self):
        return {
            "documentId": self.documentId,
            "zettelIds": self.zettelIds,
            "documentTitle": self.documentTitle,
            "content": self.content,
            "similaritySearchResult": self.similaritySearchResult,
        }
