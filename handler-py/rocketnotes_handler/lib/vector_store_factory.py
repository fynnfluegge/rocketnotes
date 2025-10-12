import os

# Import chromadb and langchain_chroma only for local development
try:
    import chromadb
    from chromadb.config import Settings
    from langchain_chroma import Chroma

    # ChromaDB is available - telemetry will be disabled via client_settings
    print("Shared ChromaDB vector store factory - telemetry disabled")

    CHROMADB_AVAILABLE = True
except ImportError as e:
    CHROMADB_AVAILABLE = False
    print(f"Shared vector store factory: ChromaDB not available ({e}) - using S3 vectors only")
    # Define dummy classes to prevent import errors
    Chroma = None
    chromadb = None
    Settings = None


from langchain_aws.vectorstores.s3_vectors import AmazonS3Vectors

is_local = os.environ.get("LOCAL", False)


def get_vector_store_factory(userId, embeddings, context=""):
    """Factory function to create appropriate vector store based on environment"""
    context_msg = f" for {context}" if context else ""
    if is_local and CHROMADB_AVAILABLE:
        print(f"Using Chroma vector store for local development{context_msg}")
        return get_chroma_vector_store(userId, embeddings, context)
    else:
        print(f"Using S3 vector store{context_msg}")
        return get_s3_vector_store(userId, embeddings)


def get_chroma_vector_store(userId, embeddings, context=""):
    """Get or create a Chroma vector store for local development"""
    try:
        collection_name = f"user_{userId}"
        context_msg = f" for {context}" if context else ""
        print(f"Connecting to Chroma collection{context_msg}: {collection_name}")

        # Create ChromaDB client with telemetry disabled (official way)
        # Try different host configurations for Docker networking
        chroma_hosts = ["host.docker.internal", "chroma", "rocketnotes-chroma", "localhost"]
        chroma_client = None

        for host in chroma_hosts:
            try:
                print(f"Attempting to connect to Chroma at {host}:8000{context_msg}")
                chroma_client = chromadb.HttpClient(
                    host=host,
                    port=8000,
                    settings=Settings(anonymized_telemetry=False)
                )
                # Test connection
                heartbeat = chroma_client.heartbeat()
                print(f"Heartbeat successful{context_msg}: {heartbeat}")
                print(f"Successfully connected to Chroma at {host}:8000{context_msg}")
                break
            except Exception as e:
                print(f"Failed to connect to Chroma at {host}:8000{context_msg}: {e}")
                continue

        if chroma_client is None:
            raise Exception(f"Could not connect to Chroma server on any host{context_msg}")

        vector_store = Chroma(
            collection_name=collection_name,
            embedding_function=embeddings,
            client=chroma_client
        )

        print(f"Successfully created Chroma vector store{context_msg} for user: {userId}")
        return vector_store
    except Exception as e:
        print(f"Error creating Chroma vector store{context_msg}: {e}")
        raise


def get_s3_vector_store(userId, embeddings):
    """Get or create an S3 vector store for the user"""
    return AmazonS3Vectors(
        vector_bucket_name="rocketnotes-vectors",
        index_name=userId,
        embeddings=embeddings
    )


def create_vector_store_from_documents(split_documents, userId, embeddings):
    """Create vector store with documents (handles both S3 and Chroma)"""
    if is_local and CHROMADB_AVAILABLE:
        print(f"Creating Chroma vector store with {len(split_documents)} documents")
        collection_name = f"user_{userId}"

        # Create ChromaDB client with telemetry disabled (official way)
        chroma_client = chromadb.HttpClient(
            host="host.docker.internal",
            port=8000,
            settings=Settings(anonymized_telemetry=False)
        )

        # For Chroma, we can use from_documents to create and populate
        vector_store = Chroma.from_documents(
            documents=split_documents,
            embedding=embeddings,
            collection_name=collection_name,
            client=chroma_client
        )
        print(f"Successfully created Chroma vector store")
        return vector_store
    else:
        print(f"Creating S3 vector store with {len(split_documents)} documents")
        # Get bucket names from environment
        bucket_name = os.environ.get("BUCKET_NAME", "default-bucket")
        vector_bucket_name = os.environ.get("VECTOR_BUCKET_NAME", bucket_name)

        vector_store = AmazonS3Vectors.from_documents(
            split_documents,
            vector_bucket_name=vector_bucket_name,
            index_name=userId,
            embedding=embeddings
        )
        print(f"Successfully created S3 vector store")
        return vector_store


def delete_document_vectors(documentId, vector_store):
    """Delete document vectors from vector store by document ID"""
    try:
        print(f"Attempting to delete vectors for document: {documentId}")

        if is_local and CHROMADB_AVAILABLE:
            # For Chroma, we can use delete with metadata filter
            vector_store.delete(where={"documentId": documentId})
            print(f"Successfully deleted vectors for document {documentId} from Chroma")
        else:
            # For S3 Vectors, use the metadata filter if available
            try:
                vector_store.delete_by_metadata_filter({"documentId": documentId})
                print(f"Successfully deleted vectors for document {documentId} from S3")
            except AttributeError:
                print(f"S3 Vectors doesn't support delete_by_metadata_filter, skipping deletion")
                # S3 Vectors might not support this method yet
                pass

    except Exception as e:
        print(f"Error deleting vectors for document {documentId}: {e}")
        # Continue execution even if deletion fails
