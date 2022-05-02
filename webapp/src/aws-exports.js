import { environment } from './environments/environment';

const awsmobile = {
    "aws_project_region": "eu-central-1",
    "aws_cognito_region": "eu-central-1",
    "aws_user_pools_id": environment.cognitoUserPoolId,
    "aws_user_pools_web_client_id": environment.cognitoAppClientId,
    "oauth": {
        "domain": "takeniftynotes.auth.eu-central-1.amazoncognito.com",
        "scope": [
            "phone",
            "email",
            "openid",
            "profile",
            "aws.cognito.signin.user.admin"
        ],
        "redirectSignIn": environment.redirectSignIn,
        "redirectSignOut": environment.redirectSignOut,
        "responseType": "code"
    }
};


export default awsmobile;