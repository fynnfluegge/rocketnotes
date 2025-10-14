import json
import os
import pytest
from unittest.mock import Mock, patch
from moto import mock_aws

import boto3
from langchain.schema import Document

# Import the handler
from rocketnotes_handler.handler_semantic_search.main import handler


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
def sample_search_event():
    """Sample Lambda event for semantic search"""
    return {
        "body": json.dumps({
            "userId": "test-user",
            "searchString": "test search query"
        })
    }


@pytest.fixture
def mock_search_results():
    """Mock search results from vector store"""
    result1 = Mock()
    result1.metadata = {
        "documentId": "doc-123"
    }

    result2 = Mock()
    result2.metadata = {
        "documentId": "doc-456"
    }

    return [result1, result2]


class TestSemanticSearchHandler:
    """Test the semantic search handler function"""

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'VECTOR_BUCKET_NAME': 'test-vector-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_semantic_search.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_semantic_search.main.get_user_config')
    @patch('rocketnotes_handler.handler_semantic_search.main.get_vector_store_factory')
    def test_successful_semantic_search(self, mock_get_vector_store_factory, mock_get_user_config,
                                      mock_get_embeddings, mock_embeddings, mock_user_config,
                                      sample_search_event, mock_search_results):
        """Test successful semantic search scenario"""
        # Setup DynamoDB
        dynamodb = boto3.client('dynamodb', region_name='us-east-1')
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

        # Add user config
        dynamodb.put_item(
            TableName='tnn-UserConfig',
            Item={'id': {'S': 'test-user'}}
        )

        # Add test documents
        dynamodb.put_item(
            TableName='tnn-Documents',
            Item={
                'id': {'S': 'doc-123'},
                'title': {'S': 'Test Document 1'},
                'content': {'S': 'This is the content of document 1'}
            }
        )

        dynamodb.put_item(
            TableName='tnn-Documents',
            Item={
                'id': {'S': 'doc-456'},
                'title': {'S': 'Test Document 2'},
                'content': {'S': 'This is the content of document 2'}
            }
        )

        # Setup mocks
        mock_get_user_config.return_value = mock_user_config
        mock_get_embeddings.return_value = mock_embeddings
        mock_vector_store = Mock()
        mock_vector_store.similarity_search.return_value = mock_search_results
        mock_get_vector_store_factory.return_value = mock_vector_store

        # Execute
        result = handler(sample_search_event, {})

        # Verify
        assert result["statusCode"] == 200

        # Parse response body
        response_body = json.loads(result["body"])
        assert len(response_body) == 2

        # Verify first result
        assert response_body[0]["documentId"] == "doc-123"
        assert response_body[0]["title"] == "Test Document 1"
        assert response_body[0]["content"] == "This is the content of document 1"

        # Verify second result
        assert response_body[1]["documentId"] == "doc-456"
        assert response_body[1]["title"] == "Test Document 2"
        assert response_body[1]["content"] == "This is the content of document 2"

        # Verify vector store factory was called correctly
        mock_get_vector_store_factory.assert_called_once_with("test-user", mock_embeddings)
        mock_vector_store.similarity_search.assert_called_once_with("test search query", k=3)

    def test_missing_body(self):
        """Test error handling when request body is missing"""
        event = {}

        result = handler(event, {})

        assert result["statusCode"] == 400
        assert result["body"] == "Request body is missing"

    def test_invalid_json_body(self):
        """Test error handling when request body contains invalid JSON"""
        event = {
            "body": "invalid json content"
        }

        result = handler(event, {})

        assert result["statusCode"] == 400
        assert result["body"] == "Invalid JSON format in request body"

    def test_missing_user_id(self):
        """Test error handling when userId is missing"""
        event = {
            "body": json.dumps({
                "searchString": "test search query"
            })
        }

        result = handler(event, {})

        assert result["statusCode"] == 400
        assert result["body"] == "userId is missing"

    def test_missing_search_string(self):
        """Test error handling when searchString is missing"""
        event = {
            "body": json.dumps({
                "userId": "test-user"
            })
        }

        result = handler(event, {})

        assert result["statusCode"] == 400
        assert result["body"] == "search_string is missing"

    @mock_aws
    @patch.dict(os.environ, {
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    def test_user_not_found(self, sample_search_event):
        """Test error handling when user is not found"""
        # Setup DynamoDB
        dynamodb = boto3.client('dynamodb', region_name='us-east-1')
        dynamodb.create_table(
            TableName='tnn-UserConfig',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )

        # Execute
        result = handler(sample_search_event, {})

        # Verify
        assert result["statusCode"] == 404
        assert json.loads(result["body"]) == "User not found"

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_semantic_search.main.get_user_config')
    def test_missing_embeddings_model(self, mock_get_user_config, sample_search_event):
        """Test error handling when embeddings model is missing"""
        # Setup DynamoDB
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

        # Execute
        result = handler(sample_search_event, {})

        # Verify
        assert result["statusCode"] == 400
        assert json.loads(result["body"]) == "Embeddings model is missing"

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'VECTOR_BUCKET_NAME': 'test-vector-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_semantic_search.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_semantic_search.main.get_user_config')
    @patch('rocketnotes_handler.handler_semantic_search.main.get_vector_store_factory')
    def test_empty_search_results(self, mock_get_vector_store_factory, mock_get_user_config,
                                 mock_get_embeddings, mock_embeddings, mock_user_config,
                                 sample_search_event):
        """Test handling of empty search results"""
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
        mock_vector_store.similarity_search.return_value = []  # Empty results
        mock_get_vector_store_factory.return_value = mock_vector_store

        # Execute
        result = handler(sample_search_event, {})

        # Verify
        assert result["statusCode"] == 200
        response_body = json.loads(result["body"])
        assert response_body == []

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'VECTOR_BUCKET_NAME': 'test-vector-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_semantic_search.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_semantic_search.main.get_user_config')
    @patch('rocketnotes_handler.handler_semantic_search.main.get_vector_store_factory')
    def test_with_vector_bucket_name_env(self, mock_get_vector_store_factory, mock_get_user_config,
                                      mock_get_embeddings, mock_embeddings, mock_user_config):
        """Test handler works correctly when VECTOR_BUCKET_NAME environment variable is set"""
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
        mock_vector_store.similarity_search.return_value = []
        mock_get_vector_store_factory.return_value = mock_vector_store

        # Test event
        event = {
            "body": json.dumps({
                "userId": "test-user",
                "searchString": "test query"
            })
        }

        # Execute
        result = handler(event, {})

        # Verify vector store factory was called correctly
        mock_get_vector_store_factory.assert_called_once_with("test-user", mock_embeddings)

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        # No VECTOR_BUCKET_NAME set - should fall back to BUCKET_NAME
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_semantic_search.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_semantic_search.main.get_user_config')
    @patch('rocketnotes_handler.handler_semantic_search.main.get_vector_store_factory')
    def test_with_bucket_name_fallback_env(self, mock_get_vector_store_factory, mock_get_user_config,
                                         mock_get_embeddings, mock_embeddings, mock_user_config):
        """Test handler works correctly when only BUCKET_NAME environment variable is set"""
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
        mock_vector_store.similarity_search.return_value = []
        mock_get_vector_store_factory.return_value = mock_vector_store

        # Test event
        event = {
            "body": json.dumps({
                "userId": "test-user",
                "searchString": "test query"
            })
        }

        # Execute
        result = handler(event, {})

        # Verify vector store factory was called correctly
        mock_get_vector_store_factory.assert_called_once_with("test-user", mock_embeddings)


if __name__ == "__main__":
    pytest.main([__file__])