<div align="center">
  <a href="https://www.takeniftynotes.net/">
    <img src="https://github.com/user-attachments/assets/5a1f80e4-ba6a-4d33-933b-13d0ded023fc" height="384">
  </a>

  # Rocketnotes

  [![Build](https://github.com/fynnfluegge/rocketnotes/actions/workflows/build-main.yaml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/build-main.yaml)
  [![Deploy](https://github.com/fynnfluegge/rocketnotes/actions/workflows/deploy.yaml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/deploy.yaml)
  [![Docker](https://github.com/fynnfluegge/rocketnotes/actions/workflows/docker-build-and-publish.yaml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/docker-build-and-publish.yaml)
  [![Electron](https://github.com/fynnfluegge/rocketnotes/actions/workflows/electron-build-and-publish.yaml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/electron-build-and-publish.yaml)
  [![License](https://img.shields.io/badge/License-MIT%20-green.svg)](https://opensource.org/licenses/MIT)

</div>

<div align="center">
<a href="https://trendshift.io/repositories/12090" target="_blank"><img src="https://trendshift.io/api/badge/repositories/12090" alt="fynnfluegge%2Frocketnotes | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</div>

&nbsp;

Rocketnotes is a web-based Markdown note taking app with LLM-powered text completion, chat and semantic search.
It utilizes a [100% Serverless RAG pipeline](https://medium.com/@fynnfluegge/serverless-rag-on-aws-bf8029f8bffd) and is built with
[langchain](https://github.com/langchain-ai/langchain),
[langgraph](https://langchain-ai.github.io/langgraph),
[faiss](https://github.com/facebookresearch/faiss),
[sentence-transformers](https://github.com/UKPLab/sentence-transformers),
[Ollama](https://github.com/jmorganca/ollama).

## How to use

- [Sign Up](https://takeniftynotes.auth.eu-central-1.amazoncognito.com/login?response_type=code&client_id=tt3v27pnqqh7elqdvq9tgmr9v&redirect_uri=https://app.takeniftynotes.net) for free and use it as a web or Electron app.
- Run it 100% [locally with Docker](INSTALLATION.md#run-with-docker)
- Check [Contribution Guide](CONTRIBUTING.md#contributing-guide) how to setup a local dev environment

## ✨ Features

- 📝 Code syntax highlighting
- 📊 Katex and Mermaid support
- 🌳 Hierarchical document tree with draggable nodes
- 🌐 Document sharing
- 🔍 Content search
- 🔦 Semantic search
- ✍️ Copilot-like text completion
- 🤖 Chat with your documents
  - Serverless RAG with faiss, OpenAI, Anthropic, Voyage
- 📦 Local mode with Docker
  - use Ollama and/or Sentence Transformers for 100% local RAG
- 📥 Zettelkasten with semantic archiving
  - insert notes snippets into most relevant documents by AI agent workflows
- 🗣️ Speech-to-text note taking
- ⚙️ [MCP Server integration](mcp/README.md)
- 🎮 Neovim plugin [rocketnotes.nvim](https://github.com/fynnfluegge/rocketnotes.nvim)

&nbsp;

<div align="center">
  
![rocketnotes_theme](https://github.com/fynnfluegge/rocketnotes/assets/16321871/6f5cf350-4560-4262-896e-44bd059b2f93)

</div>

&nbsp;

## Chat with your documents or do semantic search

- 🤖 Use the power of LLMs together with vector embeddings to chat with your notes or search them semantically.
<div align="center">
  <img width="1024" alt="Screenshot 2025-06-14 at 16 40 53" src="https://github.com/user-attachments/assets/5051be74-9e7d-41c4-bc2b-a1d9d5c75606" />
</div>

## Zettelkasten with agentic archiving

- ✍️ Save your daily note snippets into zettelkasten.
- 📥 insert notes snippets into most relevant documents by AI agent workflows
<div align="center">
  <img width="800" alt="Screenshot 2025-06-14 at 16 33 44" src="https://github.com/user-attachments/assets/77263eb4-05f5-49d4-b223-f75469912af9" />
  <img width="800" alt="Screenshot 2025-06-14 at 16 30 34" src="https://github.com/user-attachments/assets/a7a610a9-02a3-4c10-b8c5-1b8a794f587f" />
</div>


## LLM-powered text completion

- 🤖 Get Copilot-like text completion autosuggestions.
<div align="center">
  <img src="https://github.com/fynnfluegge/rocketnotes/assets/16321871/648ae135-0406-4854-a68f-fb6b3d3f0702" width="800">
</div>


## Create code snippets with syntax highlighting

- 📝 Use the power and simplicity of Markdown for your personal notes.
- 💻 Create useful code snippets in your favourite programming language with syntax highlighting.
- 📖 Share documents with external users.
<div align="center">
  <img width="800" alt="Screenshot 2025-06-14 at 15 11 32" src="https://github.com/user-attachments/assets/c0bf47bd-644d-4a34-83dd-2344905bff5f" />
</div>

&nbsp;

## Superfast Document Search

- 🔎 Search through all your documents by content.
- 🚀 Get an autosuggestion panel with all documents matching you search pattern - superfast!
<div align="center">
  <img width="768" src="https://github.com/fynnfluegge/rocketnotes/assets/16321871/0d1582fa-120f-4cc5-89c2-a490cc1a750a" width="800">
</div>

&nbsp;

## Hierarchical Document Tree

- 📚 Save your note documents hierarchical with unlimited depth of subdocuments.
- 🗂️ Structure your notes by simply drag and drop the desired document.
- 🌟 Pin favourite documents for fast top-level access.
<div align="center">
  <img width="800" alt="Screenshot 2025-06-14 at 15 35 24" src="https://github.com/user-attachments/assets/06f714aa-09bd-43de-bbdf-169f454b0a13" />
</div>

## Contributing

A good way to do the first contribution are the [good first issues](https://github.com/fynnfluegge/rocketnotes/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).
On some of the issues are already linked PRs with comments in the code what has to be done. These PRs can be picked up if not assigned to someone yet.

The most comfortable way to get started is to open the project in a ready-to-code Gitpod workspace with all packages & tools preinstalled and a running database with sample data.

<div align="center">
<a href="https://gitpod.io/#https://github.com/fynnfluegge/rocketnotes">
    <img src="https://gitpod.io/button/open-in-gitpod.svg" height="48">
  </a>
</div>

&nbsp;

If you prefer to setup the project on your local machine see [Contributing Guide](CONTRIBUTING.md#contributing-guide) and learn all required steps to run it locally in development mode.

Don't hesitate to open an issue for getting some feedback about a potential bug or if you desire a missing feature.
It is appreciated to check over current [issues](https://github.com/fynnfluegge/rocketnotes/issues) and provide feedback to existing ones or even raise a PR which solves an issue.
Any contribution is welcome!
