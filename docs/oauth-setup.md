# OAuth Provider Setup Guide

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and OAuth2 API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and "OAuth2 API"
   - Enable both APIs
4. Go to "APIs & Services" > "Credentials" > "Create Credentials" > "OAuth Client ID"
5. Configure the OAuth consent screen:
   - User Type: External
   - App name: Rocketnotes
   - User support email: your-email@domain.com
   - Developer contact information: your-email@domain.com
   - Authorized domains: Add your domain (e.g., takeniftynotes.net)
6. Create OAuth Client ID:
   - Application Type: Web Application
   - Name: Rocketnotes Web Client
   - Authorized JavaScript Origins:     ```
     https://app.takeniftynotes.net
     http://localhost:4200     ```
   - Authorized Redirect URIs:     ```
     https://app.takeniftynotes.net/callback
     http://localhost:4200/callback     ```
7. Save the Client ID and Client Secret for later use

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" > "New OAuth App"
3. Fill in the application details:
   - Application Name: Rocketnotes
   - Homepage URL: https://app.takeniftynotes.net
   - Application Description: Rocketnotes - Markdown note taking app
   - Authorization Callback URL: https://app.takeniftynotes.net/callback
4. Register application
5. Generate a new client secret and save both client ID and secret
6. Optional: Upload an application logo

## AWS Cognito Configuration

1. Go to AWS Cognito Console
2. Select your User Pool
3. Go to "Federation" > "Identity providers"
4. Add Google as Identity Provider:
   - Provider name: Google
   - Client ID: Your Google Client ID
   - Client Secret: Your Google Client Secret
   - Authorize Scope: email profile openid
   - Attribute mapping:
     - email -> email
     - name -> name
     - sub -> sub
5. Add GitHub as Identity Provider:
   - Provider name: GitHub
   - Client ID: Your GitHub Client ID
   - Client Secret: Your GitHub Client Secret
   - Authorize Scope: user:email read:user
   - Attribute mapping:
     - email -> email
     - name -> name
     - id -> username
6. Go to "App integration" > "App client settings"
7. Configure the app client:
   - Enable Identity Providers: Check "Google" and "GitHub"
   - Callback URLs:     ```
     https://app.takeniftynotes.net/callback
     http://localhost:4200/callback     ```
   - Sign out URLs:     ```
     https://app.takeniftynotes.net/logout
     http://localhost:4200/logout     ```
   - OAuth 2.0 Grant Types: Select "Authorization code grant"
   - OpenID Connect Scopes: Select "email", "openid", "profile"

## Environment Variables Setup

1. Add these variables to your GitHub repository secrets:   
  ```bash
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
  ```

2. For local development, add to your `.env` file:   
  ```bash
   export GOOGLE_CLIENT_ID=your_google_client_id
   export GOOGLE_CLIENT_SECRET=your_google_client_secret
   export GITHUB_CLIENT_ID=your_github_client_id
   export GITHUB_CLIENT_SECRET=your_github_client_secret
  ```

## Testing OAuth Flow

1. Start the application locally:   
  ```bash
   npm run start   
  ```
2. Open http://localhost:4200
3. Click "Sign In"
4. Choose either Google or GitHub
5. Authorize the application
6. You should be redirected back to the application and logged in

## Troubleshooting

### Common Issues

1. **Callback URL Mismatch**
   - Error: "redirect_uri_mismatch" or "Invalid redirect URI"
   - Solution: 
     - Double-check all callback URLs match exactly
     - Check for trailing slashes
     - Verify protocol (http vs https)

2. **CORS Issues**
   - Error: "Access to fetch blocked by CORS policy"
   - Solution:
     - Verify allowed origins in Google Console
     - Check API Gateway CORS configuration
     - Ensure environment variables are set correctly

3. **Token Errors**
   - Error: "invalid_token" or "token_expired"
   - Solution:
     - Verify client ID and secret are correct
     - Check if tokens are expired
     - Ensure proper scopes are configured
     - Check system time is correct

4. **Cognito Configuration**
   - Error: "Error: NotAuthorizedException"
   - Solution:
     - Verify Identity Provider is enabled in App Client
     - Check attribute mappings
     - Ensure proper OAuth flows are enabled

### Debug Steps

1. Check browser console for errors
2. Verify environment variables are set:
   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $GITHUB_CLIENT_ID
   ```
3. Check Lambda logs in CloudWatch
4. Verify API Gateway settings:
   - CORS configuration
   - Lambda integration
   - Authorization settings

### Security Best Practices

1. Never commit secrets to version control
2. Use environment variables for sensitive data
3. Implement rate limiting for OAuth endpoints
4. Use HTTPS for all OAuth-related traffic
5. Validate tokens on both client and server
6. Implement proper session management
7. Regular security audits and updates

## Support

If you encounter issues:
1. Check the [GitHub Issues](https://github.com/fynnfluegge/rocketnotes/issues)
2. Create a new issue with:
   - Detailed error description
   - Steps to reproduce
   - Environment details
   - Relevant logs
