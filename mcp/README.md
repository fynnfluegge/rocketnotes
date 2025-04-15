### rocketnotes-mcp

#### How to use
Get the config token from user settings under `Vim Config Token` when logged in to https://app.takeniftynotes.net.
```bash
uv run rocketnotes-mcp <CONFIG_TOKEN> <USERNAME> <PASSWORD>
```

#### Attaching mcp to Claude Desktop
1. Open the MCP settings file under `~/Library/Application Support/Claude/Settings/claude-mcp.json`
2. Add the following to the file:
```json
  "mcpServers": {
    "rocketnotes": {
      "command": "uv",
      "args": [
        "--directory",
        "some/path/to/rocketnotes/mcp",
        "run",
        "rocketnotes-mcp",
        "<CONFIG_TOKEN>",
        "<USERNAME>",
        "<PASSWORD>"
      ]
    }
  }
```
