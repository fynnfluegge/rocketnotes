import json
import os

import requests


class TokensModule:
    def __init__(self, config_path):
        self.config_path = config_path

    def get_token_file(self):
        return os.path.join(self.config_path, "tokens.json")

    def save_tokens(
        self,
        id_token,
        access_token,
        refresh_token,
        client_id,
        api_url,
        domain,
        region,
        username,
        password,
    ):
        token_file = self.get_token_file()
        tokens = {
            "IdToken": id_token.strip(),
            "AccessToken": access_token.strip(),
            "RefreshToken": refresh_token.strip(),
            "ClientId": client_id.strip(),
            "ApiUrl": api_url.strip(),
            "Domain": domain.strip(),
            "Region": region.strip(),
            "Username": username.strip(),
            "Password": password.strip(),
        }
        try:
            with open(token_file, "w") as file:
                json.dump(tokens, file)
        except IOError:
            print("Failed to open token file for writing.")

    def get_tokens(self) -> tuple:
        token_file = self.get_token_file()
        if not os.path.exists(token_file):
            print("Token file not found.")
            return None, None, None, None, None, None, None, None

        try:
            with open(token_file, "r") as file:
                content = file.read()
                if not content:
                    print("Token file is empty.")
                    return None, None, None, None, None, None, None, None

                tokens = json.loads(content)
                return (
                    tokens.get("IdToken"),
                    tokens.get("AccessToken"),
                    tokens.get("RefreshToken"),
                    tokens.get("ClientId"),
                    tokens.get("ApiUrl"),
                    tokens.get("Domain"),
                    tokens.get("Region"),
                    tokens.get("Username"),
                    tokens.get("Password"),
                )
        except (IOError, json.JSONDecodeError):
            print("Failed to read or parse token file.")
            return None, None, None, None, None, None, None, None

    def refresh_token(self):
        (
            id_token,
            access_token,
            refresh_token,
            client_id,
            api_url,
            domain,
            region,
            username,
            password,
        ) = self.get_tokens()
        if not all([refresh_token, client_id, domain, region]):
            print("Missing required tokens for refresh.")
            return

        url = f"https://{domain}.auth.{region}.amazoncognito.com/oauth2/token"
        body = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        try:
            response = requests.post(url, data=body, headers=headers)
            if response.status_code == 200:
                tokens = response.json()
                id_token = tokens.get("id_token")
                access_token = tokens.get("access_token")
                self.save_tokens(
                    id_token,
                    access_token,
                    refresh_token,
                    client_id,
                    api_url,
                    domain,
                    region,
                    username,
                    password,
                )
            elif "NotAuthorizedException" in response.text:
                self.update_tokens_from_username_and_password(
                    client_id, region, api_url, domain, username, password
                )
            else:
                print("Failed to refresh token:", response.text)
        except requests.RequestException as e:
            print("HTTP request failed:", e)

    def update_tokens_from_username_and_password(
        self, client_id, region, api_url, domain, username, password
    ):
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
            response = requests.post(url, json=body, headers=headers)
            if response.status_code == 200:
                auth_result = response.json().get("AuthenticationResult", {})
                id_token = auth_result.get("IdToken")
                access_token = auth_result.get("AccessToken")
                refresh_token = auth_result.get("RefreshToken")
                if id_token and access_token and refresh_token:
                    self.save_tokens(
                        id_token,
                        access_token,
                        refresh_token,
                        client_id,
                        api_url,
                        domain,
                        region,
                        username,
                        password,
                    )
                else:
                    print("Failed to retrieve tokens from response.")
            elif "NotAuthorizedException" in response.text:
                print("Login failed: Incorrect username or password.")
            else:
                print("Failed to update tokens:", response.text)
        except requests.RequestException as e:
            print("HTTP request failed:", e)
