import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import Auth from '@aws-amplify/auth';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor() { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return environment.production
      ? Auth.currentAuthenticatedUser()
        .then(() => {
          return true;
        })
        .catch(() => {
          // Redirect to Cognito hosted UI with all providers
          const cognito_domain = `https://${environment.domainName}.auth.${environment.awsRegion}.amazoncognito.com`;
          const redirect_uri = encodeURIComponent(environment.redirectSignIn);
          const hosted_ui_url = `${cognito_domain}/login?response_type=code&client_id=${environment.cognitoAppClientId}&redirect_uri=${redirect_uri}`;
          window.location.assign(hosted_ui_url);
          return false;
        })
      : true;
  }
}
