const awsmobile = {
    "aws_project_region": "eu-central-1",
    "aws_cognito_region": "eu-central-1",
    "aws_user_pools_id": "eu-central-1_FjpoPfr51",
    "aws_user_pools_web_client_id": "4it9fm6jifrvov4djvep3vn9sp",
    "oauth": {
        "domain": "takeniftynotes.auth.eu-central-1.amazoncognito.com",
        "scope": [
            "phone",
            "email",
            "openid",
            "profile",
            "aws.cognito.signin.user.admin"
        ],
        "redirectSignIn": "http://localhost:4200/dashboard",
        "redirectSignOut": "http://localhost:4200/logout",
        "responseType": "code"
    }
};


export default awsmobile;