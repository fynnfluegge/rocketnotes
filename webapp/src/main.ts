import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { Amplify } from 'aws-amplify';

const amplifyConfig = {
  aws_project_region: environment.awsRegion,
  aws_cognito_region: environment.awsRegion,
  aws_user_pools_id: environment.cognitoUserPoolId,
  aws_user_pools_web_client_id: environment.cognitoAppClientId,
  oauth: {
    domain:
      environment.domainName +
      '.auth.' +
      environment.awsRegion +
      '.amazoncognito.com',
    scope: [
      'phone',
      'email',
      'openid',
      'profile',
      'aws.cognito.signin.user.admin',
    ],
    redirectSignIn: environment.redirectSignIn,
    redirectSignOut: environment.redirectSignOut,
    responseType: 'code',
  },
};

if (environment.production) {
  enableProdMode();

  Amplify.configure(amplifyConfig);
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
