# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rocketnotes is an AI-powered markdown note-taking application with semantic search, chat capabilities, and document archiving. It features a serverless RAG pipeline built with langchain, langgraph, and S3-based vector storage, supporting both cloud and local deployment.

## Architecture

The project follows a microservices architecture with three main components:

- **Frontend (webapp/)**: Angular 18 + TypeScript application with Electron support
- **Go Handlers (handler-go/)**: Lambda functions for document CRUD operations, user management, and search
- **Python Handlers (handler-py/)**: AI-powered features including semantic search, chat, vector embeddings, and agentic archiving
- **Infrastructure**: AWS SAM template with DynamoDB, S3, and Lambda functions

### Key Directories

- `webapp/src/app/component/`: Angular components (editor, navigation, zettelkasten, dialogs)
- `webapp/src/app/service/`: Angular services for API communication
- `handler-go/`: Individual Go Lambda handlers for basic CRUD operations
- `handler-py/rocketnotes_handler/`: Python modules for AI functionality
- `mcp/`: Model Context Protocol server integration

## Development Commands

### Initial Setup
```bash
# Install dependencies
npm install

# Start local services (DynamoDB + S3)
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
cd handler-py

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
- Uses AWS S3 for vector storage via `langchain_aws.vectorstores.s3_vectors.AmazonS3Vectors`
- Eliminates local file caching (previously used FAISS with temporary files)
- Environment variables: `VECTOR_BUCKET_NAME` (preferred) or fallback to `BUCKET_NAME`
- Per-user vector indexes stored as `{userId}` in the configured S3 bucket

### AI Integration
- Multiple LLM support: OpenAI, Anthropic, Together AI
- Vector embeddings using sentence-transformers
- Semantic search and chat using S3-based vector storage (AmazonS3Vectors)
- Configurable bucket names: `BUCKET_NAME` and `VECTOR_BUCKET_NAME` environment variables
- Agentic document archiving with langgraph workflows

### API Structure
- RESTful API through AWS API Gateway
- CORS enabled for local development
- Go handlers for basic CRUD operations
- Python handlers for AI-powered features

## Local Development Notes

- API runs on `http://localhost:3000`
- Frontend runs on `http://localhost:4200`
- DynamoDB local accessible on port 8000
- S3 mock (localstack) on port 4566
- Authentication is bypassed in development

## Testing

- Angular: Jasmine/Karma for unit tests
- Python: pytest for handler testing with comprehensive mocking
  - AWS services mocked using moto (DynamoDB, S3)
  - LangChain components mocked for isolated testing
  - Environment variable patching for configuration testing
  - Test coverage for semantic search, chat, and vector embeddings handlers
- Go: Standard Go testing framework

## Build and Deployment

The project uses AWS SAM for infrastructure as code and supports both local Docker deployment and AWS cloud deployment.