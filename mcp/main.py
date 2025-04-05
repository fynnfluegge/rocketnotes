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
USERNAME = ""
PASSWORD = ""


if __name__ == "__main__":
    ## TODO init Constants witn get_token_from_cache
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
