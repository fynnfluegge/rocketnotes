import json
import os
import pytest
from unittest.mock import Mock, patch
from moto import mock_aws

import boto3

# Import the handler
from rocketnotes_handler.handler_chat.main import handler


@pytest.fixture
def mock_embeddings():
    """Mock embeddings model"""
    embeddings = Mock()
    embeddings.embed_documents = Mock(return_value=[[0.1, 0.2, 0.3]])
    embeddings.embed_query = Mock(return_value=[0.1, 0.2, 0.3])
    return embeddings


@pytest.fixture
def mock_llm():
    """Mock LLM model"""
    llm = Mock()
    return llm


@pytest.fixture
def mock_user_config():
    """Mock user config"""
    config = Mock()
    config.embeddingsModel = "openai"
    config.llm = "gpt-3.5-turbo"
    config.id = "test-user"
    return config


@pytest.fixture
def sample_chat_event():
    """Sample Lambda event for chat"""
    return {
        "body": json.dumps({
            "userId": "test-user",
            "prompt": "What is the main topic discussed in the documents?"
        })
    }


@pytest.fixture
def mock_retriever():
    """Mock retriever"""
    retriever = Mock()
    return retriever


@pytest.fixture
def mock_conversational_chain():
    """Mock conversational retrieval chain"""
    chain = Mock()
    chain.return_value = {"answer": "The main topic is artificial intelligence and machine learning."}
    return chain


class TestChatHandler:
    """Test the chat handler function"""

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'VECTOR_BUCKET_NAME': 'test-vector-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_chat.main.ConversationalRetrievalChain')
    @patch('rocketnotes_handler.handler_chat.main.get_chat_model')
    @patch('rocketnotes_handler.handler_chat.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_chat.main.get_user_config')
    @patch('rocketnotes_handler.handler_chat.main.get_vector_store_factory')
    def test_successful_chat(self, mock_get_vector_store_factory, mock_get_user_config,
                           mock_get_embeddings, mock_get_chat_model, mock_chain_class,
                           mock_embeddings, mock_llm, mock_user_config,
                           sample_chat_event, mock_retriever, mock_conversational_chain):
        """Test successful chat scenario"""
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
        mock_get_chat_model.return_value = mock_llm

        mock_vector_store = Mock()
        mock_vector_store.as_retriever.return_value = mock_retriever
        mock_get_vector_store_factory.return_value = mock_vector_store

        mock_chain_instance = Mock()
        mock_chain_instance.return_value = {"answer": "The main topic is artificial intelligence and machine learning."}
        mock_chain_class.from_llm.return_value = mock_chain_instance

        # Execute
        result = handler(sample_chat_event, {})

        # Verify
        assert result["statusCode"] == 200

        # Parse response body
        response_body = json.loads(result["body"])
        assert response_body == "The main topic is artificial intelligence and machine learning."

        # Verify vector store factory was called correctly
        mock_get_vector_store_factory.assert_called_once_with("test-user", mock_embeddings)

        # Verify retriever was configured correctly
        mock_vector_store.as_retriever.assert_called_once_with(
            search_type="similarity",
            search_kwargs={"k": 3}
        )

        # Verify chain was created and called
        mock_chain_class.from_llm.assert_called_once_with(mock_llm, retriever=mock_retriever)
        mock_chain_instance.assert_called_once_with({
            "question": "Based on the context provided, answer the following question and respond in markdown format: What is the main topic discussed in the documents?\n\nDon't return a markdown code block, just return the answer in markdown syntax.",
            "chat_history": []
        })

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
                "prompt": "What is the main topic?"
            })
        }

        result = handler(event, {})

        assert result["statusCode"] == 400
        assert result["body"] == "userId is missing"

    def test_missing_prompt(self):
        """Test error handling when prompt is missing"""
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
    def test_user_not_found(self, sample_chat_event):
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
        result = handler(sample_chat_event, {})

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
    @patch('rocketnotes_handler.handler_chat.main.get_user_config')
    def test_missing_embeddings_model(self, mock_get_user_config, sample_chat_event):
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
        config.llm = "gpt-3.5-turbo"
        mock_get_user_config.return_value = config

        # Execute
        result = handler(sample_chat_event, {})

        # Verify
        assert result["statusCode"] == 400
        assert json.loads(result["body"]) == "Embeddings model is missing"

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_chat.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_chat.main.get_user_config')
    def test_missing_llm_model(self, mock_get_user_config, mock_get_embeddings,
                              mock_embeddings, sample_chat_event):
        """Test error handling when LLM model is missing"""
        # Setup DynamoDB
        dynamodb = boto3.client('dynamodb', region_name='us-east-1')
        dynamodb.create_table(
            TableName='tnn-UserConfig',
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )
        dynamodb.put_item(TableName='tnn-UserConfig', Item={'id': {'S': 'test-user'}})

        # Mock user config with no LLM model
        config = Mock()
        config.embeddingsModel = "openai"
        config.llm = None
        mock_get_user_config.return_value = config
        mock_get_embeddings.return_value = mock_embeddings

        # Execute
        result = handler(sample_chat_event, {})

        # Verify
        assert result["statusCode"] == 400
        assert json.loads(result["body"]) == "LLM model is missing"

    @mock_aws
    @patch.dict(os.environ, {
        'BUCKET_NAME': 'test-bucket',
        'VECTOR_BUCKET_NAME': 'test-vector-bucket',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'AWS_ACCESS_KEY_ID': 'testing',
        'AWS_SECRET_ACCESS_KEY': 'testing',
        'AWS_SESSION_TOKEN': 'testing'
    })
    @patch('rocketnotes_handler.handler_chat.main.ConversationalRetrievalChain')
    @patch('rocketnotes_handler.handler_chat.main.get_chat_model')
    @patch('rocketnotes_handler.handler_chat.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_chat.main.get_user_config')
    @patch('rocketnotes_handler.handler_chat.main.get_vector_store_factory')
    def test_with_vector_bucket_name_env(self, mock_get_vector_store_factory, mock_get_user_config,
                                      mock_get_embeddings, mock_get_chat_model, mock_chain_class,
                                      mock_embeddings, mock_llm, mock_user_config):
        """Test chat handler works correctly when VECTOR_BUCKET_NAME environment variable is set"""
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
        mock_get_chat_model.return_value = mock_llm

        mock_vector_store = Mock()
        mock_retriever = Mock()
        mock_vector_store.as_retriever.return_value = mock_retriever
        mock_get_vector_store_factory.return_value = mock_vector_store

        mock_chain_instance = Mock()
        mock_chain_instance.return_value = {"answer": "Test response"}
        mock_chain_class.from_llm.return_value = mock_chain_instance

        # Test event
        event = {
            "body": json.dumps({
                "userId": "test-user",
                "prompt": "test query"
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
    @patch('rocketnotes_handler.handler_chat.main.ConversationalRetrievalChain')
    @patch('rocketnotes_handler.handler_chat.main.get_chat_model')
    @patch('rocketnotes_handler.handler_chat.main.get_embeddings_model')
    @patch('rocketnotes_handler.handler_chat.main.get_user_config')
    @patch('rocketnotes_handler.handler_chat.main.get_vector_store_factory')
    def test_with_bucket_name_fallback_env(self, mock_get_vector_store_factory, mock_get_user_config,
                                         mock_get_embeddings, mock_get_chat_model, mock_chain_class,
                                         mock_embeddings, mock_llm, mock_user_config):
        """Test chat handler works correctly when only BUCKET_NAME environment variable is set"""
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
        mock_get_chat_model.return_value = mock_llm

        mock_vector_store = Mock()
        mock_retriever = Mock()
        mock_vector_store.as_retriever.return_value = mock_retriever
        mock_get_vector_store_factory.return_value = mock_vector_store

        mock_chain_instance = Mock()
        mock_chain_instance.return_value = {"answer": "Test response"}
        mock_chain_class.from_llm.return_value = mock_chain_instance

        # Test event
        event = {
            "body": json.dumps({
                "userId": "test-user",
                "prompt": "test query"
            })
        }

        # Execute
        result = handler(event, {})

        # Verify vector store factory was called correctly
        mock_get_vector_store_factory.assert_called_once_with("test-user", mock_embeddings)


if __name__ == "__main__":
    pytest.main([__file__])