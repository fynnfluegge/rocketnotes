import base64
import json

import httpx


def refresh_token(client_id, region, domain, refresh_token):
    url = f"https://{domain}.auth.{region}.amazoncognito.com/oauth2/token"
    body = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    try:
        response = httpx.post(url, data=body, headers=headers)
        if response.status_code == 200:
            tokens = response.json()
            access_token = tokens.get("access_token")
            id_token = tokens.get("id_token")
            print("Tokens refreshed successfully.")
            return {
                "id_token": id_token,
                "access_token": access_token,
                "refresh_token": refresh_token,
            }
        elif "NotAuthorizedException" in response.text:
            # get_tokens_from_username_and_password(client_id, region, username, password)
            print("Refresh token expired. Please log in again.")
        else:
            print("Failed to refresh token:", response.text)
    except httpx.RequestError as e:
        print("HTTP request failed:", e)


def get_tokens_from_username_and_password(client_id, region, username, password):
    url = f"https://cognito-idp.{region}.amazonaws.com/"
    body = {
        "AuthParameters": {"USERNAME": username, "PASSWORD": password},
        "AuthFlow": "USER_PASSWORD_AUTH",
        "ClientId": client_id,
    }
    headers = {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    }

    try:
        response = httpx.post(url, json=body, headers=headers)
        if response.status_code == 200:
            auth_result = response.json().get("AuthenticationResult", {})
            access_token = auth_result.get("AccessToken")
            refresh_token = auth_result.get("RefreshToken")
            id_token = auth_result.get("IdToken")
            if access_token and refresh_token:
                print("Tokens retrieved successfully.")
                return {
                    "id_token": id_token,
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                }
            else:
                print("Failed to retrieve tokens from response.")
        elif "NotAuthorizedException" in response.text:
            print("Login failed: Incorrect username or password.")
        else:
            print("Failed to update tokens:", response.text)
    except httpx.RequestError as e:
        print("HTTP request failed:", e)


def decode_token(token):
    try:
        # Split the token into its parts (header, payload, signature)
        parts = token.split(".")
        if len(parts) < 2:
            raise ValueError("Invalid token format")

        # Decode the payload (second part of the token) from Base64
        payload_base64 = parts[1]
        # Add padding if necessary for Base64 decoding
        payload_base64 += "=" * (-len(payload_base64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_base64).decode("utf-8")

        # Parse the JSON payload into a dictionary
        decoded_payload = json.loads(payload_json)
        return decoded_payload
    except (ValueError, json.JSONDecodeError) as e:
        print(f"Failed to decode token: {e}")
        return None
