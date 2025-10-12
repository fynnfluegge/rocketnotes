import json
import os
import pytest
from unittest.mock import Mock, patch, MagicMock
from moto import mock_aws

import boto3
from langchain.schema import Document

# Import the handler
from rocketnotes_handler.handler_vector_embeddings.main import (
    handler,
    split_document
)


@pytest.fixture
def mock_embeddings():
    """Mock embeddings model"""
    embeddings = Mock()
    embeddings.embed_documents = Mock(return_value=[[0.1, 0.2, 0.3]])
    embeddings.embed_query = Mock(return_value=[0.1, 0.2, 0.3])
    return embeddings


@pytest.fixture
def mock_user_config():
    """Mock user config"""
    config = Mock()
    config.embeddingsModel = "openai"
    config.id = "test-user"
    return config


@pytest.fixture
def sample_document():
    """Sample DynamoDB document"""
    return {
        "id": {"S": "doc-123"},
        "title": {"S": "Test Document"},
        "content": {"S": "# Header 1\nThis is test content.\n## Header 2\nMore content here."},
        "userId": {"S": "test-user"}
    }


@pytest.fixture
def sample_event():
    """Sample Lambda event"""
    return {
        "Records": [{
            "body": json.dumps({
                "userId": "test-user",
                "documentId": "doc-123",
                "recreateIndex": False,
                "deleteVectors": False
            })
        }]
    }


class TestDocumentOperations:
    """Test document operations"""

    def test_split_document(self):
        """Test document splitting functionality"""
        content = "# Header 1\nContent 1\n## Header 2\nContent 2"
        doc_id = "doc-123"
        title = "Test Doc"

        result = split_document(content, doc_id, title)

        assert len(result) == 2
        assert all(isinstance(doc, Document) for doc in result)
        assert all(doc.metadata["documentId"] == doc_id for doc in result)
        assert all(doc.metadata["title"] == title for doc in result)
        # Verify content is stored as string, not bytes
        assert all(isinstance(doc.metadata["original_content"], str) for doc in result)


class TestVectorEmbeddingsHandler:
    """Test the main handler function"""

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'VECTOR_BUCKET_NAME': 'test-vector-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_vector_embeddings.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_vector_embeddings.main.get_user_config')
    @patch('rocketnotes_handler.handler_vector_embeddings.main.get_vector_store_factory')
    def test_delete_vectors_scenario(self, mock_get_vector_store_factory, mock_get_user_config,
                                   mock_get_embeddings, mock_embeddings, mock_user_config):
        """Test delete vectors scenario"""
        # Setup DynamoDB
        dynamodb = boto3.client('dynamodb', region_name='us-east-1')
        dynamodb.create_table(
            TableName='tnn-UserConfig',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )

        # Add user config
        dynamodb.put_item(
            TableName='tnn-UserConfig',
            Item={'id': {'S': 'test-user'}}
        )

        # Setup mocks
        mock_get_user_config.return_value = mock_user_config
        mock_get_embeddings.return_value = mock_embeddings
        mock_vector_store = Mock()
        mock_get_vector_store_factory.return_value = mock_vector_store

        # Test event
        event = {
            "Records": [{
                "body": json.dumps({
                    "userId": "test-user",
                    "documentId": "doc-123",
                    "deleteVectors": True
                })
            }]
        }

        # Execute
        result = handler(event, {})

        # Verify
        assert result["statusCode"] == 200
        # Verify vector store factory was called
        mock_get_vector_store_factory.assert_called_once_with("test-user", mock_embeddings)

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'VECTOR_BUCKET_NAME': 'test-vector-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_vector_embeddings.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_vector_embeddings.main.get_user_config')
    @patch('rocketnotes_handler.handler_vector_embeddings.main.get_vector_store_factory')
    def test_update_document_scenario(self, mock_get_vector_store_factory, mock_get_user_config,
                                    mock_get_embeddings, mock_embeddings, mock_user_config,
                                    sample_document):
        """Test update single document scenario"""
        # Setup DynamoDB
        dynamodb = boto3.client('dynamodb', region_name='us-east-1')

        # Create tables
        dynamodb.create_table(
            TableName='tnn-UserConfig',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )

        dynamodb.create_table(
            TableName='tnn-Documents',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )

        # Add data
        dynamodb.put_item(TableName='tnn-UserConfig', Item={'id': {'S': 'test-user'}})
        dynamodb.put_item(TableName='tnn-Documents', Item=sample_document)

        # Setup mocks
        mock_get_user_config.return_value = mock_user_config
        mock_get_embeddings.return_value = mock_embeddings
        mock_vector_store = Mock()
        mock_get_vector_store_factory.return_value = mock_vector_store

        # Test event
        event = {
            "Records": [{
                "body": json.dumps({
                    "userId": "test-user",
                    "documentId": "doc-123",
                    "recreateIndex": False
                })
            }]
        }

        # Execute
        result = handler(event, {})

        # Verify
        assert result["statusCode"] == 200
        # Verify vector store factory was called
        mock_get_vector_store_factory.assert_called_once_with("test-user", mock_embeddings)

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'VECTOR_BUCKET_NAME': 'test-vector-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_vector_embeddings.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_vector_embeddings.main.get_user_config')
    @patch('rocketnotes_handler.handler_vector_embeddings.main.create_vector_store_from_documents')
    def test_recreate_index_scenario(self, mock_create_vector_store_from_documents, mock_get_user_config,
                                   mock_get_embeddings, mock_embeddings, mock_user_config):
        """Test recreate index scenario"""
        # Setup DynamoDB
        dynamodb = boto3.client('dynamodb', region_name='us-east-1')

        # Create tables
        dynamodb.create_table(
            TableName='tnn-UserConfig',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )

        dynamodb.create_table(
            TableName='tnn-Documents',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'},
                {'AttributeName': 'userId', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST',
            GlobalSecondaryIndexes=[{
                'IndexName': 'userId-index',
                'KeySchema': [{'AttributeName': 'userId', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'}
            }]
        )

        # Add test documents
        test_docs = [
            {
                "id": {"S": "doc-1"},
                "userId": {"S": "test-user"},
                "title": {"S": "Doc 1"},
                "content": {"S": "# Header\nContent for document 1"}
            },
            {
                "id": {"S": "doc-2"},
                "userId": {"S": "test-user"},
                "title": {"S": "Doc 2"},
                "content": {"S": "# Header\nContent for document 2"}
            }
        ]

        dynamodb.put_item(TableName='tnn-UserConfig', Item={'id': {'S': 'test-user'}})
        for doc in test_docs:
            dynamodb.put_item(TableName='tnn-Documents', Item=doc)

        # Setup mocks
        mock_get_user_config.return_value = mock_user_config
        mock_get_embeddings.return_value = mock_embeddings
        mock_vector_store = Mock()
        mock_create_vector_store_from_documents.return_value = mock_vector_store

        # Test event
        event = {
            "Records": [{
                "body": json.dumps({
                    "userId": "test-user",
                    "recreateIndex": True
                })
            }]
        }

        # Execute
        result = handler(event, {})

        # Verify
        assert result["statusCode"] == 200
        mock_create_vector_store_from_documents.assert_called_once()
        # Verify documents were passed to create_vector_store_from_documents
        call_args = mock_create_vector_store_from_documents.call_args
        documents = call_args[0][0]
        assert len(documents) == 2  # Two documents split

    def test_error_handling_user_not_found(self, sample_event):
        """Test error handling when user is not found"""
        with mock_aws(), patch.dict("os.environ", {
            'AWS_DEFAULT_REGION': 'us-east-1',
            'AWS_ACCESS_KEY_ID': 'testing',
            'AWS_SECRET_ACCESS_KEY': 'testing',
            'AWS_SESSION_TOKEN': 'testing'
        }):
            dynamodb = boto3.client('dynamodb', region_name='us-east-1')
            dynamodb.create_table(
                TableName='tnn-UserConfig',
                KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
                AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
                BillingMode='PAY_PER_REQUEST'
            )

            result = handler(sample_event, {})

            assert result["statusCode"] == 404
            assert "User not found" in result["body"]

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_vector_embeddings.main.get_user_config')
    def test_error_handling_no_embeddings_model(self, mock_get_user_config, sample_event):
        """Test error handling when embeddings model is missing"""
        # Setup
        dynamodb = boto3.client('dynamodb', region_name='us-east-1')
        dynamodb.create_table(
            TableName='tnn-UserConfig',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )
        dynamodb.put_item(TableName='tnn-UserConfig', Item={'id': {'S': 'test-user'}})

        # Mock user config with no embeddings model
        config = Mock()
        config.embeddingsModel = None
        mock_get_user_config.return_value = config

        result = handler(sample_event, {})

        assert result["statusCode"] == 400
        assert "Embeddings model is missing" in result["body"]


if __name__ == "__main__":
    pytest.main([__file__])
