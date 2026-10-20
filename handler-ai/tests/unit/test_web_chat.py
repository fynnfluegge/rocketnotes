"""Exercise the chat entrypoint through the real MCP SDK and a scripted LLM."""

import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import Mock
from uuid import uuid4

import httpx
import pytest
from langchain_core.messages import AIMessage
from mcp.client.streamable_http import streamablehttp_client

from rocketnotes_handler.handler_chat import main
from rocketnotes_handler.lib import web_search


@pytest.fixture
def caller(monkeypatch):
    for name in ("PARALLEL_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.delenv("ROCKETNOTES_WEB_SEARCH_ENABLED", raising=False)
    database = Mock()
    database.get_item.return_value = {
        "Item": {"id": {"S": "private-user"}, "llm": {"S": "Ollama-test"}}
    }
    monkeypatch.setattr(main, "get_boto3_clients", lambda: (Mock(), database))
    llm = Mock()
    llm.invoke.return_value = AIMessage(content="A sourced answer [1].")
    get_model = Mock(return_value=llm)
    monkeypatch.setattr(main, "get_chat_model", get_model)
    private_notes = Mock(side_effect=AssertionError("Web chat must not read notes"))
    monkeypatch.setattr(main, "get_embeddings_model", private_notes)
    monkeypatch.setattr(main, "get_vector_store_factory", private_notes)
    requests = []
    calls = []
    state = {"failure": None, "text_only": False}

    async def respond(request):
        requests.append(request)
        assert str(request.url) == web_search.MCP_URL
        assert request.headers["user-agent"] == web_search.USER_AGENT
        if request.method != "POST":
            return httpx.Response(405)
        body = json.loads(request.content)
        method = body["method"]
        if method.startswith("notifications/"):
            return httpx.Response(202)
        if method == "initialize":
            result = {
                "protocolVersion": body["params"]["protocolVersion"],
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "parallel-fixture", "version": "1"},
            }
        elif method == "tools/list":
            result = {
                "tools": [
                    {"name": name, "inputSchema": {"type": "object"}}
                    for name in ("web_search", "web_fetch")
                ]
            }
        elif method == "tools/call":
            calls.append(body["params"])
            failure = state["failure"]
            if failure == "http":
                return httpx.Response(503)
            if failure == "slow":
                await asyncio.sleep(60)
            data = {
                "results": [
                    {
                        "url": "https://example.org/research",
                        "title": "Research",
                        "excerpts": ["The latest research finding."],
                    }
                ]
            }
            if failure == "empty":
                data["results"] = []
            if failure == "malformed":
                data = {"unexpected": "response"}
            result = {
                "content": [{"type": "text", "text": json.dumps(data)}],
                "isError": failure in ("tool", "quota"),
            }
            if not state["text_only"]:
                result["structuredContent"] = data
        else:
            raise AssertionError(method)
        return httpx.Response(
            200, json={"jsonrpc": "2.0", "id": body["id"], "result": result}
        )

    def client_factory(**kwargs):
        return httpx.AsyncClient(transport=httpx.MockTransport(respond), **kwargs)

    def transport(url, **kwargs):
        return streamablehttp_client(url, httpx_client_factory=client_factory, **kwargs)

    monkeypatch.setattr(web_search, "streamablehttp_client", transport)

    def invoke(question="What is new in research?", conversation_id=None, **extra):
        body = {"userId": "private-user", "prompt": question, "searchContext": "web"}
        if conversation_id is not None:
            body["conversationId"] = conversation_id
        body.update(extra)
        return main.handler({"body": json.dumps(body)}, {})

    return invoke, requests, calls, llm, get_model, state


def test_unconfigured_web_chat_consumes_anonymous_mcp_sources(caller):
    invoke, requests, calls, llm, get_model, _ = caller
    result = invoke()
    assert result["statusCode"] == 200
    answer = json.loads(result["body"])
    assert "A sourced answer [1]." in answer
    assert "[Research](<https://example.org/research>)" in answer
    assert all("authorization" not in request.headers for request in requests)
    assert calls[0]["name"] == "web_search"
    assert calls[0]["arguments"]["objective"] == "What is new in research?"
    assert get_model.call_args.args[0].llm == "Ollama-test"
    messages = llm.invoke.call_args.args[0]
    assert "The latest research finding." in "\n".join(m.content for m in messages)
    assert "private-user" not in json.dumps(calls)


def test_explicit_credentials_are_used(caller, monkeypatch):
    invoke, requests, _, _, _, _ = caller
    monkeypatch.setenv("PARALLEL_API_KEY", "configured-test-key")
    assert invoke()["statusCode"] == 200
    assert all(
        r.headers["authorization"] == "Bearer configured-test-key" for r in requests
    )


def test_search_fetch_followup_and_retry_keep_conversation_id(caller):
    invoke, _, calls, _, _, state = caller
    conversation_id = str(uuid4())
    assert invoke(conversation_id=conversation_id)["statusCode"] == 200
    assert (
        invoke("Read https://example.org/guide", conversation_id)["statusCode"] == 200
    )
    state["failure"] = "quota"
    assert invoke(conversation_id=conversation_id)["statusCode"] == 503
    state["failure"] = None
    assert invoke(conversation_id=conversation_id)["statusCode"] == 200
    assert [call["name"] for call in calls] == [
        "web_search",
        "web_fetch",
        "web_search",
        "web_search",
    ]
    assert {call["arguments"]["session_id"] for call in calls} == {conversation_id}
    assert calls[1]["arguments"]["urls"] == ["https://example.org/guide"]


def test_standalone_and_concurrent_conversations_are_isolated(caller):
    invoke, _, calls, _, _, _ = caller
    assert invoke()["statusCode"] == 200
    assert invoke()["statusCode"] == 200
    assert calls[0]["arguments"]["session_id"] != calls[1]["arguments"]["session_id"]
    ids = [str(uuid4()), str(uuid4())]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda cid: invoke(conversation_id=cid), ids * 2))
    assert all(result["statusCode"] == 200 for result in results)
    assert sorted(call["arguments"]["session_id"] for call in calls[2:]) == sorted(
        ids * 2
    )


def test_disabled_and_invalid_context_never_contact_mcp(caller, monkeypatch):
    invoke, requests, _, _, _, _ = caller
    monkeypatch.setenv("ROCKETNOTES_WEB_SEARCH_ENABLED", "false")
    assert invoke()["statusCode"] == 403
    monkeypatch.delenv("ROCKETNOTES_WEB_SEARCH_ENABLED")
    assert invoke(searchContext="unknown")["statusCode"] == 400
    assert invoke(conversation_id="personal-information")["statusCode"] == 400
    assert invoke(question="")["statusCode"] == 400
    assert not requests


def test_private_notes_remain_the_default(caller, monkeypatch):
    invoke, requests, _, _, _, _ = caller
    config = Mock(embeddingsModel="text-embedding-3-small", llm="gpt-test")
    monkeypatch.setattr(main, "get_user_config", lambda _: config)
    monkeypatch.setattr(main, "get_embeddings_model", Mock())
    monkeypatch.setattr(main, "get_vector_store_factory", Mock())
    chain = Mock(return_value={"answer": "Private-note answer"})
    monkeypatch.setattr(
        main.ConversationalRetrievalChain, "from_llm", Mock(return_value=chain)
    )
    result = main.handler({"body": json.dumps({"userId": "u", "prompt": "Notes?"})}, {})
    assert json.loads(result["body"]) == "Private-note answer"
    assert not requests
    assert invoke(searchContext="notes")["statusCode"] == 200
    assert not requests


@pytest.mark.parametrize("failure", ["tool", "http", "empty", "malformed", "slow"])
def test_web_failures_do_not_invoke_model_or_fall_back(caller, monkeypatch, failure):
    invoke, _, _, llm, _, state = caller
    state["failure"] = failure
    if failure == "slow":
        monkeypatch.setattr(web_search, "SEARCH_TIMEOUT", 0.1)
    result = invoke()
    assert result["statusCode"] == 503
    llm.invoke.assert_not_called()


def test_text_only_mcp_response(caller):
    invoke, _, _, _, _, state = caller
    state["text_only"] = True
    assert invoke()["statusCode"] == 200


def test_invalid_url_and_excess_urls_do_not_contact_mcp(caller):
    invoke, requests, _, _, _, _ = caller
    assert invoke("Read https://name:secret@example.org")["statusCode"] == 503
    assert (
        invoke(" ".join(f"https://example.org/{i}" for i in range(6)))["statusCode"]
        == 503
    )
    assert not requests


@pytest.mark.parametrize("wrapped", [False, True])
def test_fetch_preserves_balanced_url_parentheses(caller, wrapped):
    invoke, _, calls, _, _, _ = caller
    url = "https://en.wikipedia.org/wiki/Python_(programming_language)"
    question = f"Read [this page]({url})" if wrapped else f"Read {url}"
    assert invoke(question)["statusCode"] == 200
    assert calls[0]["arguments"]["urls"] == [url]


def test_cancellation_propagates_and_stops_transport(caller):
    _, requests, _, llm, _, state = caller
    state["failure"] = "slow"

    async def run():
        task = asyncio.create_task(
            web_search.retrieve_web_context("Question", str(uuid4()))
        )
        while not any(b'"tools/call"' in request.content for request in requests):
            await asyncio.sleep(0.001)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    async def bounded_run():
        await asyncio.wait_for(run(), timeout=2)

    asyncio.run(bounded_run())
    llm.invoke.assert_not_called()
