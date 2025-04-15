import base64
import json
import re
import sys
from typing import Any

import httpx
from auth import decode_token, get_tokens_from_username_and_password, refresh_token

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("rocketnotes")

ACCESS_TOKEN = None
API_URL = None
USER_ID = None
CLIENT_ID = None
DOMAIN = None
REGION = None
REFRESH_TOKEN = None


def run():
    global API_URL, CLIENT_ID, DOMAIN, REGION, ACCESS_TOKEN, REFRESH_TOKEN, ID_TOKEN, USER_ID
    args = sys.argv[1:]

    if len(args) < 1:
        print("Error: No arguments provided.")
        sys.exit(1)

    base64_encoded_arg = args[0]

    try:
        decoded_bytes = base64.b64decode(base64_encoded_arg)
        decoded_string = decoded_bytes.decode("utf-8")
        parsed_args = json.loads(decoded_string)
        API_URL = parsed_args["apiUrl"]
        CLIENT_ID = parsed_args["clientId"]
        DOMAIN = parsed_args["domain"]
        REGION = parsed_args["region"]
    except (ValueError, UnicodeDecodeError) as e:
        print(f"Error decoding Base64 argument: {e}")
        sys.exit(1)

    username = args[1]
    password = args[2]

    tokens = get_tokens_from_username_and_password(
        CLIENT_ID,
        REGION,
        username,
        password,
    )

    if not tokens:
        print("Failed to retrieve tokens.")
        sys.exit(1)

    ACCESS_TOKEN = tokens["access_token"]
    REFRESH_TOKEN = tokens["refresh_token"]
    ID_TOKEN = tokens["id_token"]
    decoded_id_token = decode_token(ID_TOKEN)
    if not decoded_id_token:
        print("Failed to decode ID token.")
        sys.exit(1)

    USER_ID = decoded_id_token["sub"]

    mcp.run(transport="stdio")


@mcp.tool()
async def exact_search(query: str) -> str | None:
    """
    Perform an exact search with the given query on your knowledge base.
    """
    global ACCESS_TOKEN
    url = f"{API_URL}/search-documents/{USER_ID}?searchString={query}"
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}

    try:
        response = httpx.get(
            url,
            headers=headers,
        )

        if response.status_code == 200:
            result = find_with_context(response.text, query)
            return result[0]["context"] if result else None
        elif response.status_code == 401:
            tokens = refresh_token(
                CLIENT_ID,
                REGION,
                REFRESH_TOKEN,
                DOMAIN,
            )
            if not tokens:
                print("Failed to refresh tokens.")
                return None
            ACCESS_TOKEN = tokens["access_token"]
            response = httpx.get(
                url,
                headers=headers,
            )
            if response.status_code == 200:
                result = find_with_context(response.text, query)
                return result[0]["context"] if result else None
            else:
                print(
                    f"Failed to fetch document after refreshing token. Status code: {response.status_code}"
                )
                print(f"Response: {response.text}")
                return None
        else:
            print(f"Failed to fetch document. Status code: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except httpx.RequestError as e:
        print(f"An error occurred while fetching the document: {e}")
        return None


@mcp.tool()
async def documents_similarity_search(query: str) -> list[dict[str, Any]] | None:
    """
    Perform a similarity search with the given query on your knowledge base.
    """
    global ACCESS_TOKEN
    url = f"{API_URL}/semanticSearch"
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}

    try:
        response = httpx.post(
            url,
            headers=headers,
            json={
                "userId": USER_ID,
                "searchString": query,
            },
        )

        if response.status_code == 200:
            return json.loads(response.text)[0].get("content", None)
        elif response.status_code == 401:
            tokens = refresh_token(
                CLIENT_ID,
                REGION,
                REFRESH_TOKEN,
                DOMAIN,
            )
            if not tokens:
                print("Failed to refresh tokens.")
                return None
            ACCESS_TOKEN = tokens["access_token"]
            response = httpx.post(
                url,
                headers=headers,
                json={
                    "userId": USER_ID,
                    "searchString": query,
                },
            )

            if response.status_code == 200:
                return json.loads(response.text)[0].get("content", None)
            else:
                print(
                    f"Failed to fetch document after refreshing token. Status code: {response.status_code}"
                )
                print(f"Response: {response.text}")
                return None
        else:
            print(f"Failed to fetch document. Status code: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except httpx.RequestError as e:
        print(f"An error occurred while fetching the document: {e}")
        return None


def find_with_context(large_string, search_string, context=128):
    # Escape special characters in search string
    pattern = re.escape(search_string)

    # Search for all matches
    matches = []
    for match in re.finditer(pattern, large_string):
        start = max(match.start() - context, 0)
        end = min(match.end() + context, len(large_string))
        context_snippet = large_string[start:end]
        matches.append(
            {
                "match_start": match.start(),
                "match_end": match.end(),
                "context": context_snippet,
            }
        )

    return matches
