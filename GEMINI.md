# Gemini Project Configuration: Rocketnotes

## Project Overview

This is a monorepo for Rocketnotes, a note-taking application. It consists of a web frontend, several Go backend services, Python-based AI/ML handlers, and a model context protocol (MCP).

## Global Commands

Use these commands from the project root directory (`/Users/fynn/workspace/rocketnotes`).

- **Install all dependencies:** `npm install && (cd handler-py && uv pip sync) && (cd mcp && uv pip sync)`
- **Run linting across all projects:** `... (if applicable)`
- **Run all tests:** `... (if applicable)`

## Project Structure & Commands

This section details the individual projects within the monorepo.

---

### 1. `webapp`

- **Description:** The Angular-based web application frontend.
- **Path:** `/webapp`
- **Tech Stack:** TypeScript, Angular, Electron.js
- **Key Commands (run from `/webapp`):**
  - **Install:** `npm install`
  - **Build:** `npm run build`
  - **Test:** `npm run test`
  - **Start Dev Server:** `npm start`
  - **Build Electron App:** `npm run electron:build`

---

### 2. `handler-go`

- **Description:** Go-based serverless functions (AWS Lambda) for core backend logic.
- **Path:** `/handler-go`
- **Tech Stack:** Go
- **Key Commands (run from `/handler-go`):**
  - **Build:** `go build ./...`
  - **Test:** `go test ./...`
  - **Tidy modules:** `go mod tidy`

---

### 3. `handler-py`

- **Description:** Python-based handlers for AI/ML features like semantic search and embeddings.
- **Path:** `/handler-py`
- **Tech Stack:** Python, Pytest, UV
- **Key Commands (run from `/handler-py`):**
  - **Install:** `uv pip sync`
  - **Test:** `pytest`
  - **Activate venv:** `source .venv/bin/activate`

---

### 4. `mcp` (Model Context Protocol)

- **Description:** A central Python server or tool for managing the system.
- **Path:** `/mcp`
- **Tech Stack:** Python, UV
- **Key Commands (run from `/mcp`):**
  - **Install:** `uv pip sync`
  - **Run:** `python -m rocketnotes_mcp`

---

## Coding Conventions

- **Commit Messages:** Follow the Conventional Commits specification (e.g., `feat(webapp): add new button`).
- **Go:** Run `gofmt` before committing.
- **Python:** Adhere to PEP 8. Use `ruff` for linting and formatting.
- **TypeScript/Angular:** Follow the standard Angular style guide.
