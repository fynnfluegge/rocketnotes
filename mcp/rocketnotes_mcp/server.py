import base64
import json
import os
import sys
from pathlib import Path
from typing import Any

import httpx

from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("rocketnotes")

# Constants
API_URL = ""
CLIENT_ID = ""
DOMAIN = ""
REGION = ""


if sys.platform == "darwin":  # macOS
    TOKENS_FILE = Path.home() / "Library/Application Support/rocketnotes/token.json"
elif sys.platform.startswith("linux"):  # Linux
    TOKENS_FILE = Path.home() / ".config/rocketnotes/token.json"
elif sys.platform == "win32":  # Windows
    TOKENS_FILE = Path.home() / "AppData/Roaming/rocketnotes/token.json"
else:
    raise OSError("Unsupported operating system")


def run():
    args = sys.argv[1:]  # Exclude the script name

    if len(args) < 1:
        print("Error: No arguments provided.")
        sys.exit(1)

    base64_encoded_arg = args[0]

    try:
        decoded_bytes = base64.b64decode(base64_encoded_arg)
        decoded_string = decoded_bytes.decode("utf-8")  # Convert bytes to string
        parsed_args = json.loads(decoded_string)
        API_URL = parsed_args["apiUrl"]
        CLIENT_ID = parsed_args["clientId"]
        DOMAIN = parsed_args["domain"]
        REGION = parsed_args["region"]
    except (ValueError, UnicodeDecodeError) as e:
        print(f"Error decoding Base64 argument: {e}")
        sys.exit(1)

    mcp.run(transport="stdio")


@mcp.tool()
async def hello_world() -> str:
    """
    A simple hello world tool.
    """
    return "Hello, world!"


@mcp.tool()
async def documents_similarity_search(
    query: str,
) -> list[dict[str, Any]]:
    """
    Perform a similarity search with the given query on your knowledge base.
    """
    return []


async def get_fresh_auth_token() -> str:
    return ""


async def get_token_from_cache() -> str:
    return ""
