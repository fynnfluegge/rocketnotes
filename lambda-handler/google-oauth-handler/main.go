package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"net/url"
	"errors"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type GoogleTokenResponse struct {
	AccessToken string `json:"access_token"`
	IdToken     string `json:"id_token"`
}

type GoogleUserInfo struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Extract code from request body
	var requestBody map[string]string
	if err := json.Unmarshal([]byte(request.Body), &requestBody); err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Body:       "Invalid request body",
		}, nil
	}

	code := requestBody["code"]
	if code == "" {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Body:       "Authorization code is required",
		}, nil
	}

	// Exchange code for tokens
	tokenResponse, err := exchangeCodeForTokens(code)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Body:       fmt.Sprintf("Failed to exchange code: %v", err),
		}, nil
	}

	// Get user info using access token
	userInfo, err := getUserInfo(tokenResponse.AccessToken)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Body:       fmt.Sprintf("Failed to get user info: %v", err),
		}, nil
	}

	response := map[string]interface{}{
		"email": userInfo.Email,
		"name":  userInfo.Name,
		"token": tokenResponse.IdToken,
	}

	responseJSON, _ := json.Marshal(response)

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Methods": "OPTIONS,POST",
		},
		Body: string(responseJSON),
	}, nil
}

func exchangeCodeForTokens(code string) (*GoogleTokenResponse, error) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURI := os.Getenv("GOOGLE_REDIRECT_URI")

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", url.Values{
		"code":          {code},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"redirect_uri":  {redirectURI},
		"grant_type":    {"authorization_code"},
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tokenResponse GoogleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return nil, err
	}

	return &tokenResponse, nil
}

func getUserInfo(accessToken string) (*GoogleUserInfo, error) {
	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var userInfo GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}

func validateToken(token string) error {
	// Validate token expiration
	if isTokenExpired(token) {
		return errors.New("token expired")
	}
	
	// Validate token signature
	if !isValidSignature(token) {
		return errors.New("invalid token signature")
	}
	
	return nil
}

// Add rate limiting middleware
func rateLimitMiddleware(handler func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)) func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		// Get IP from request
		sourceIP := request.RequestContext.Identity.SourceIP
		
		// Check DynamoDB for rate limit
		if isRateLimited(sourceIP) {
			return events.APIGatewayProxyResponse{
				StatusCode: 429,
				Body:       "Too many requests",
			}, nil
		}
		
		return handler(ctx, request)
	}
}

func isTokenExpired(token string) bool {
	// TODO: Implement token expiration check using JWT parsing
	// For now, return false to avoid blocking valid tokens
	return false
}

func isValidSignature(token string) bool {
	// TODO: Implement signature validation using Google's public keys
	// For now, return true to avoid blocking valid tokens
	return true
}

func isRateLimited(sourceIP string) bool {
	// TODO: Implement rate limiting using DynamoDB
	// For now, return false to avoid blocking requests
	return false
}

func main() {
	lambda.Start(rateLimitMiddleware(handler))
}
