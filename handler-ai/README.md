### Create virtual environment
```bash
uv venv
```

### Activate virtual environment
```bash
source .venv/bin/activate
```

### Deactivate virtual environment
```bash
deactivate

```

### List installed packages
```bash
uv pip list
```

### Install dependencies
```bash
uv pip install -r pyproject.toml
```

### Run tests
```bash
uv run pytest tests -s
```

### Web context in chat

In the chat dialog, select **Context → Web** to answer a question using public
web sources. In Web mode, include an HTTP/HTTPS URL in your question to read that page.
With URLs, chat fetches those pages instead of running a general search (up to
five URLs per question). Answers include a **Web sources** list.

[Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp)
is the default web provider. Anonymous search uses Fast mode and needs no
Parallel account or API key. Free access has usage limits; optionally set
`PARALLEL_API_KEY` on the chat handler for higher limits. Your existing LLM
selection and its credentials still generate the answer. Web mode does not need
an embedding model.

**My notes** remains the initial context. Web mode sends the question and any
included URLs to Parallel; it does not retrieve or send private notes. Select
**My notes** to use document chat again. Administrators can prohibit web access
by setting `ROCKETNOTES_WEB_SEARCH_ENABLED=false` on the chat handler.
Search failures are reported without switching to private notes or another
provider. Web retrieval has a 15-second timeout, separate from model inference.
Closing the application cancels the browser request; a running Lambda invocation
may still complete.

The dialog sends a random `conversationId` for related requests. **New chat**
clears messages and creates a new ID. Existing chat is stateless with respect to
model history: write self-contained follow-up questions. Questions, usernames
and API keys are never used to derive the ID.

#### Chat API

`POST /chat` keeps the existing JSON string response. The request accepts:

```json
{
  "userId": "your-user-id",
  "prompt": "What changed in the latest Python release?",
  "searchContext": "web",
  "conversationId": "a6e7a03c-b97b-4e7f-b511-fd34285cf41f"
}
```

Omit `searchContext` (or use `notes`) for existing private-note chat. Use `web`
for public sources. `conversationId` is an optional UUID: API clients should
create one per conversation and reuse it across searches, page reads and retries;
if omitted, each request is treated as a standalone run. Web questions must be
nonempty strings of at most 8,000 characters. Unknown contexts or invalid IDs
return 400, disabled web access returns 403, and unavailable web context returns
503. User lookup and configured model requirements still apply.
