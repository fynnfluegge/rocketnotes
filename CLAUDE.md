# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rocketnotes is an AI-powered markdown note-taking application with semantic search, chat capabilities, and document archiving. It features a serverless RAG pipeline built with langchain, langgraph, and S3-based vector storage, supporting both cloud and local deployment.

## Architecture

The project follows a microservices architecture with three main components:

- **Frontend (webapp/)**: Angular 18 + TypeScript application with Electron support
- **Go Handlers (handler-crud/)**: Lambda functions for document CRUD operations, user management, and search
- **Python Handlers (handler-ai/)**: AI-powered features including semantic search, chat, vector embeddings, and agentic archiving
- **Infrastructure**: AWS SAM template with DynamoDB, S3, and Lambda functions

### Key Directories

- `webapp/src/app/component/`: Angular components (editor, navigation, zettelkasten, dialogs)
- `webapp/src/app/service/`: Angular services for API communication
- `handler-crud/`: Individual Go Lambda handlers for basic CRUD operations
- `handler-ai/rocketnotes_handler/`: Python modules for AI functionality
- `mcp/`: Model Context Protocol server integration

## Development Commands

### Initial Setup
```bash
# Install dependencies
npm install

# Start local services (DynamoDB + S3 + ChromaDB)
npm run start-services

# Initialize database with sample data
npm run init-db
```

### Development Workflow
```bash
# Build and start API (Lambda functions)
npm run build-api
npm run start-api

# Start Angular development server
npm run start-webapp
```

### Frontend Development
```bash
cd webapp

# Development server
npm run start

# Build for production
npm run build

# Run tests
npm test

# Electron app
npm run start-electron
npm run build-electron
```

### Python Handler Testing
```bash
cd handler-ai

# Create and activate virtual environment
uv env
source .venv/bin/activate

# Install dependencies
uv pip install -r pyproject.toml

# Install dev dependencies (using uv)
uv pip install -e ".[dev]"

# Run all tests
uv run pytest tests -s

# Run specific handler tests
uv run pytest tests/unit/test_semantic_search_handler.py -v
uv run pytest tests/unit/test_chat_handler.py -v
uv run pytest tests/unit/test_vector_embeddings_handler.py -v

# List installed packages
uv pip list

# Deactivate virtual environment
deactivate
```

## Key Technical Details

### Authentication
- Uses AWS Cognito in production
- Authentication disabled in development environment
- AuthGuard protects routes in Angular app

### Database Schema
- DynamoDB table: `tnn-documents` for document storage
- DynamoDB table: `tnn-UserConfig` for user configuration including AI model settings
- Hierarchical document structure with unlimited nesting
- Zettelkasten inbox for quick note capture

### Vector Storage
The application uses a dual vector storage approach optimized for different environments:

**Local Development:**
- **ChromaDB**: Fast, local vector database for development and testing
- **Docker Container**: `chromadb/chroma:0.4.24` accessible on port 8000
- **Telemetry Disabled**: Comprehensive telemetry disabling at container and client level
- **Multi-host Support**: Automatic fallback between `host.docker.internal`, `chroma`, `rocketnotes-chroma`, `localhost`
- **Per-user Collections**: Isolated collections as `user_{userId}`

**Production:**
- **AWS S3 Vectors**: Serverless vector storage via `langchain_aws.vectorstores.s3_vectors.AmazonS3Vectors`
- **Environment Variables**: `VECTOR_BUCKET_NAME` (preferred) or fallback to `BUCKET_NAME`
- **Per-user Vector Indexes**: Isolated indexes stored as `{userId}` in the configured S3 bucket
- **Auto-creation**: Vector indexes are automatically created when documents are added

**Shared Factory Pattern:**
- **Environment Detection**: Automatically switches based on `LOCAL` environment variable
- **Unified Interface**: `get_vector_store_factory()` provides consistent API across environments
- **Context-aware Logging**: Detailed logging for debugging vector operations

### AI Integration
- **Multiple LLM Support**: OpenAI, Anthropic, Together AI with configurable model selection
- **Vector Embeddings**: Support for various embedding providers (OpenAI, Anthropic, sentence-transformers)
- **Semantic Search & Chat**: Environment-aware vector storage (ChromaDB locally, S3 Vectors in production)
- **RAG Pipeline**: Retrieval-Augmented Generation using LangChain with vector similarity search
- **Agentic Document Archiving**: Automated document processing using LangGraph workflows
- **Embedding Compatibility**: All embedding providers work with ChromaDB; S3 Vectors supports any embeddings via LangChain interface

### API Structure
- RESTful API through AWS API Gateway
- CORS enabled for local development
- Go handlers for basic CRUD operations
- Python handlers for AI-powered features

## Local Development Notes

- **API**: `http://localhost:3000` (AWS SAM local)
- **Frontend**: `http://localhost:4200` (Angular dev server)
- **DynamoDB Local**: Port 8041 (mapped from container port 8000)
- **ChromaDB**: Port 8000 (vector database for local development)
- **S3 Mock**: Port 9091 (mapped from container port 9090)
- **Authentication**: Bypassed in development environment
- **Vector Storage**: Automatically uses ChromaDB when `LOCAL=true` environment variable is set

## Testing

- **Angular**: Jasmine/Karma for unit tests
- **Python**: pytest for handler testing with comprehensive mocking
  - AWS services mocked using moto (DynamoDB, S3)
  - Vector store factory mocked for isolated testing
  - Environment variable patching for configuration testing
  - Test coverage for semantic search, chat, and vector embeddings handlers
  - Tests are environment-agnostic (work with both ChromaDB and S3 vectors)
- **Go**: Standard Go testing framework
- **Vector Storage Testing**:
  - Local: Use ChromaDB container for integration testing
  - Production: Deploy to AWS with actual S3 vector bucket
  - Unit tests mock the vector store factory for fast execution

## Build and Deployment

The project uses AWS SAM for infrastructure as code and supports both local Docker deployment and AWS cloud deployment.
