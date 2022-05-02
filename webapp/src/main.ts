import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import Amplify, { Auth } from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

const oauth = {
  // Domain name
  domain : 'takeniftynotes.auth.eu-central-1.amazoncognito.com', 

  // Authorized scopes
  scope : ['email', 'openid'], 

  // Callback URL
  redirectSignIn : environment.redirectSignIn, 
  
  // Sign out URL
  redirectSignOut : environment.redirectSignOut,

  // 'code' for Authorization code grant, 
  // 'token' for Implicit grant
  responseType: 'code',

  // optional, for Cognito hosted ui specified options
  options: {
      // Indicates if the data collection is enabled to support Cognito advanced security features. By default, this flag is set to true.
      AdvancedSecurityDataCollectionFlag : false
  }
}

Auth.configure({
  oauth:oauth
});

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
