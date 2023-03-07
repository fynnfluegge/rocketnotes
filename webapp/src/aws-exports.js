import { environment } from './environments/environment';

const awsmobile = {
    "aws_project_region": environment.awsRegion,
    "aws_cognito_region": environment.awsRegion,
    "aws_user_pools_id": environment.cognitoUserPoolId,
    "aws_user_pools_web_client_id": environment.cognitoAppClientId,
    "oauth": {
        "domain": environment.domainName + ".auth." + environment.awsRegion + ".amazoncognito.com",
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