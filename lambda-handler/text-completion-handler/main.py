import json
import os

from anthropic import Anthropic


def handler(event, context):
    if "body" in event:
        try:
            request_body = json.loads(event["body"])
        except json.JSONDecodeError:
            return {"statusCode": 400, "body": "Invalid JSON format in request body"}
    else:
        return {"statusCode": 400, "body": "Request body is missing"}

    if "prompt" in request_body:
        prompt = request_body["prompt"]
    else:
        return {"statusCode": 400, "body": "search_string is missing"}

    if "model" in request_body:
        model = request_body["model"]
    else:
        return {"statusCode": 400, "body": "model is missing"}

    if "api_key" in request_body:
        os.environ["ANTHROPIC_API_KEY"] = request_body["api_key"]
    else:
        return {"statusCode": 400, "body": "Anthropic API key is missing"}

    client = Anthropic(
        api_key=os.environ.get("ANTHROPIC_API_KEY"),
    )

    message = client.messages.create(
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model=model,
    )

    return {"statusCode": 200, "body": message.content}
