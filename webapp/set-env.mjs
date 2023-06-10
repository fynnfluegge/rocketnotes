import { writeFile } from 'fs';
// Configure Angular `environment.ts` file path
const targetPath = `./src/environments/environment.${process.argv[2] === 'prod' ? 'prod' : 'dev'}.ts`;
// Load node modules
// `environment.ts` file structure
const envConfigFile = `export const environment = {
    production: ${process.argv[2] === 'prod' ? true : false},
    awsRegion: '${process.env.AWS_REGION}',
    domainName: '${process.env.DOMAIN_NAME}',
    cognitoUserPoolId: '${process.env.COGNITO_USER_POOL_ID}',
    cognitoAppClientId: '${process.env.COGNITO_APP_CLIENT_ID}',
    redirectSignIn: '${process.env.REDIRECT_SIGN_IN}',
    redirectSignOut: '${process.env.REDIRECT_SIGN_OUT}',
    authGuardRedirect: '${process.env.AUTH_GUARD_REDIRECT}',
    apiUrl: '${process.env.API_URL}'
};
`;
writeFile(targetPath, envConfigFile, function (err) {
   if (err) {
       throw console.error(err);
   } else {
       console.log(`Angular environment.ts file generated correctly at ${targetPath} \n`);
   }
});

const proxyConfigFile = `{
    "/documentTree": {
        "target": ${process.env.API_URL},
        "secure": false,
        "changeOrigin": true
    }
}
`;

writeFile("./proxy.conf.json", proxyConfigFile, function (err) {
    if (err) {
        throw console.error(err);
    } else {
        console.log(`Angular proxy.conf.json generated correctly \n`);
    }
 });