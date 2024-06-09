<div align="center">
  <a href="https://www.takeniftynotes.net/">
    <img src="landing-page/src/assets/128x128.png" height="128">
  </a>
  
  # Rocketnotes
  
  [![Build](https://github.com/fynnfluegge/rocketnotes/actions/workflows/build.yml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/build.yml)
  [![Deploy](https://github.com/fynnfluegge/rocketnotes/actions/workflows/deploy.yml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/deploy.yml)
  [![License](https://img.shields.io/badge/License-MIT%20-green.svg)](https://opensource.org/licenses/MIT)

</div>

Rocketnotes is a web-based Markdown note taking app with LLM-powered text completion, chat and semantic search. It utilizes a 100% serverless RAG pipeline build with [langchain](https://github.com/langchain-ai/langchain), [sentence-transformers](https://github.com/UKPLab/sentence-transformers),
[faiss](https://github.com/facebookresearch/faiss), [Ollama](https://github.com/jmorganca/ollama) and OpenAI or Anthropic API.  
Checkout how the serverless RAG pipeline works here [Serverless RAG on AWS](https://medium.com/@fynnfluegge/serverless-rag-on-aws-bf8029f8bffd).

## How to run

- You can [Sign Up](https://takeniftynotes.auth.eu-central-1.amazoncognito.com/login?response_type=code&client_id=tt3v27pnqqh7elqdvq9tgmr9v&redirect_uri=https://app.takeniftynotes.net) for free
- Run it 100% [locally with Docker](INSTALLATION.md#run-on-your-local-machine-with-docker)
- Deploy to [AWS](INSTALLATION.md#aws-hosting)

## ✨ Features

- 📝 Code syntax highlighting
- 🌳 Hierarchical document tree with draggable nodes
- 🌐 Document sharing
- 🔍 Content search
- 🔦 Semantic search
- ✍️ Copilot-like text completion
- 🤖 Chat with your documents
  - Servlerless RAG with faiss, OpenAI and/or Anthropic
- 📦 Local mode with Docker
  - use Ollama and/or Sentence Transformers for 100% local RAG

&nbsp;

<div align="center">
  
![rocketnotes_theme](https://github.com/fynnfluegge/rocketnotes/assets/16321871/6f5cf350-4560-4262-896e-44bd059b2f93)

</div>

## Chat with your documents or do semantic search

- 🤖 Use the power of LLMs together with vector embeddings to chat with your notes or search them semantically.
<div align="center">
  <img src="https://github.com/fynnfluegge/rocketnotes/assets/16321871/6bb831ff-e7f2-41ab-824b-609fbb62853b" width="800">
</div>

## LLM-powered text completion

- 🤖 Get Copilot-like text completion autosuggestions.
<div align="center">
  <img src="https://github.com/fynnfluegge/rocketnotes/assets/16321871/648ae135-0406-4854-a68f-fb6b3d3f0702" width="800">
</div>

## Create code snipptes with syntax highlighting

- 📝 Use the power and simplicity of Markdown for your personal notes.
- 💻 Create useful code snippets in your favourite programming language with syntax highlighting.
- 📖 Share documents with external users.
<div align="center">
  <img src="landing-page/src/assets/code_editor.gif">
</div>

&nbsp;

## Superfast Document Search

- 🔎 Search through all your documents by content.
- 🚀 Get an autosuggestion panel with all documents matching you search pattern - superfast!
<div align="center">
  <img src="https://github.com/fynnfluegge/rocketnotes/assets/16321871/0d1582fa-120f-4cc5-89c2-a490cc1a750a" width="800">
</div>

&nbsp;

## Hierarchical Document Tree

- 📚 Save your note documents hierarchical with unlimited depth of subdocuments.
- 🗂️ Structure your notes by simply drag and drop the desired document.
- 🌟 Pin favourite documents for fast top-level access.
<div align="center">
  <img src="landing-page/src/assets/tree.gif">
</div>

&nbsp;

## 🌟 Contributing

The most comfortable way to get started is to open the project in a ready-to-code Gitpod workspace with all packages & tools preinstalled and a running database with sample data.

<div align="center">
<a href="https://gitpod.io/#https://github.com/fynnfluegge/rocketnotes">
    <img src="https://gitpod.io/button/open-in-gitpod.svg" height="48">
  </a>
</div>

If you prefer to setup the project on your local machine visit the [get started guide](CONTRIBUTING.md#getting-started) with all required steps to run the project locally in development mode.

You find also the contribution guidelines there.
Don't hesitate to open an issue for getting some feedback about a potential bug or if you desire a missing feature.
We also appreciate to check over current [issues](https://github.com/fynnfluegge/rocketnotes/issues) and provide feedback to existing ones or even raise a PR which solves an issue.
Any contribution is welcome!
