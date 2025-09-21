<div align="center">
  <a href="https://www.takeniftynotes.net/">
    <img src="https://github.com/user-attachments/assets/82041555-ba66-400e-a899-8f9c1bc70bcf" height="384">
  </a>

  # Rocketnotes

  [![Build](https://github.com/fynnfluegge/rocketnotes/actions/workflows/build-main.yaml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/build-main.yaml)
  [![Deploy](https://github.com/fynnfluegge/rocketnotes/actions/workflows/deploy.yaml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/deploy.yaml)
  [![Docker](https://github.com/fynnfluegge/rocketnotes/actions/workflows/docker-build-and-publish.yaml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/docker-build-and-publish.yaml)
  [![Electron](https://github.com/fynnfluegge/rocketnotes/actions/workflows/electron-build-and-publish.yaml/badge.svg)](https://github.com/fynnfluegge/rocketnotes/actions/workflows/electron-build-and-publish.yaml)
  [![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

<div align="center">
<a href="https://trendshift.io/repositories/12090" target="_blank"><img src="https://trendshift.io/api/badge/repositories/12090" alt="fynnfluegge%2Frocketnotes | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</div>

&nbsp;

Rocketnotes is a web-based Markdown note taking app with native AI feature integrations like chat, text completion, voice-to-text transcriptions and agentic document archiving.  
It utilizes a [100% Serverless RAG pipeline](https://medium.com/@fynnfluegge/serverless-rag-on-aws-bf8029f8bffd) built with
[langchain](https://github.com/langchain-ai/langchain),
[langgraph](https://langchain-ai.github.io/langgraph),
[faiss](https://github.com/facebookresearch/faiss),
[sentence-transformers](https://github.com/UKPLab/sentence-transformers),
[Ollama](https://github.com/jmorganca/ollama).

## How to use

- [Sign Up](https://takeniftynotes.auth.eu-central-1.amazoncognito.com/login?response_type=code&client_id=tt3v27pnqqh7elqdvq9tgmr9v&redirect_uri=https://app.takeniftynotes.net) for free and use it as a web or Electron app
- Run it 100% [locally with Docker](INSTALLATION.md#run-with-docker)
- Check [Contribution Guide](CONTRIBUTING.md#contributing-guide) how to setup a local dev environment
- Self-hosting on AWS

test

<div align="center">
  
![rocketnotes_theme](https://github.com/user-attachments/assets/cccfba22-803a-4135-8c08-eca1bd229768)


</div>


## ✨ Features

- 📝 **Code Syntax Highlighting**: For developers and technical users to save and read code snippets in a clean, readable format.
- 📊 **Katex and Mermaid Support**: Embed complex mathematical formulas (Katex) and create diagrams or flowcharts (Mermaid) directly within your documents.
- 🌳 **Hierarchical Document Tree**: Organize documents in a nested structure with drag-and-drop functionality to easily restructure your knowledge base.
- 🌐 **Document Sharing**: Collaborate by sharing specific documents with others.
- 🔍 **Content Search**: A fast and efficient way to find specific notes by searching for keywords within their content.
- 🔦 **Semantic Search**: Goes beyond keyword search to understand the meaning behind your query and find the most conceptually related notes.
- ✍️ **Copilot-like Text Completion**: The AI suggests ways to complete your sentences or paragraphs, speeding up the writing process.
- 🤖 **Chat with Your Documents**: Ask questions in natural language and get answers synthesized from your own documents.
- ✨ **Multi-LLM Support**: Seamlessly switch between different Large Language Models, with current support for OpenAI, Anthropic and Together AI models.
- 📥 **Zettelkasten with Agentic Archiving**: An AI agent analyzes snippets from your "inbox" and intelligently files them into the most relevant existing document.
- 🗣️ **Voice-to-Text Note Taking**: Dictate your notes instead of typing them.
- 📦 **Local Mode with Docker**: Run the entire application on your own machine using Ollama for 100% local and private AI processing.
- ⚙️ **MCP Server Integration**: Integrate your knowledge base as MCP to use it with any LLM application.
- 🎮 **Neovim Plugin**: Integrate your note-taking directly into the Neovim code editor.

## 🛠️ Tech Stack

- **Frontend**: Angular, TypeScript, Electron
- **Backend**: Go, Python
- **AI**: Langchain, Langgraph, Faiss
- **Infrastructure**: AWS, Docker
- **Database**: DynamoDB
- **Storage**: S3

## 💬 Chat with your documents

- 🤖 Use LLMs together with vector embeddings to chat with your documents.
<div align="center">
  <img width="812" alt="Screenshot 2025-06-14 at 16 40 53" src="https://github.com/user-attachments/assets/5051be74-9e7d-41c4-bc2b-a1d9d5c75606" />
</div>

## ✍️ LLM-powered text completions

<div align="center">
  <img src="https://github.com/user-attachments/assets/ee8bc520-71fd-498d-b7f1-042a28884446" width="680">
</div>

&nbsp;

## 💻 Code documents with syntax highlighting

- Create useful code snippets in your favourite programming language with syntax highlighting.
<div align="center">
  <img width="812" alt="Screenshot 2025-06-14 at 15 11 32" src="https://github.com/user-attachments/assets/c0bf47bd-644d-4a34-83dd-2344905bff5f" />
</div>

## ⚡ Superfast Document Search

- 🔎 Search through all your documents by content.
- 🚀 Get autosuggestions for all documents matching your search pattern - superfast!
<div align="center">
  <img width="768" src="https://github.com/fynnfluegge/rocketnotes/assets/16321871/0d1582fa-120f-4cc5-89c2-a490cc1a750a" width="800">
</div>

&nbsp;

## 🌳 Hierarchical Document Tree

- 📚 Save your documents hierarchically with unlimited depth of subdocuments.
- 🗂️ Structure your documents with drag and drop.
- 🌟 Pin favourite documents for fast top-level access.
<div align="center">
  <img width="800" alt="Screenshot 2025-06-14 at 15 35 24" src="https://github.com/user-attachments/assets/06f714aa-09bd-43de-bbdf-169f454b0a13" />
</div>


## 📥 Zettelkasten inbox with agentic archiving

- ✍️ Save your daily note snippets into zettelkasten inbox by typing or voice recording.
<div align="center">
  <img width="640" alt="Screenshot 2025-07-08 at 22 15 47" src="https://github.com/user-attachments/assets/6fbf86ce-4e2f-42b2-b6dc-fd32ce2ffe2f" />
</div>

- 🤖 Insert note snippets into most relevant documents by AI agent workflows.
<div align="center">
  <img width="640" alt="Screenshot 2025-07-08 at 22 18 07" src="https://github.com/user-attachments/assets/bd5e7a7b-17fb-48eb-861d-da7241a02fc2" />
</div>

## ⭐️ Star History

<div align="center">
  <img src="https://api.star-history.com/svg?repos=fynnfluegge/rocketnotes&type=Date" width="600" />
</div>

## 🙌 Contributing

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

## 🛟 Troubleshooting

- ### Apple could not verify “rocketnotes” is free of malware that may harm your Mac or compromise your privacy.
  - This happens since the `dmg` file was not build with an official Apple developer license. To circumvent this, open Settings -> Privacy & Security -> Security -> "rocketnotes" was blocked to protect your Mac -> Open Anyway
