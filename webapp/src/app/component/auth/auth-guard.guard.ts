import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import Auth from '@aws-amplify/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router){
  }

  canActivate(route: ActivatedRouteSnapshot,state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return Auth.currentAuthenticatedUser().then(() => { return true; })
      .catch(() => {
        window.location.assign("https://takeniftynotes.auth.eu-central-1.amazoncognito.com/login?response_type=code&client_id=4it9fm6jifrvov4djvep3vn9sp&redirect_uri=http://localhost:4200/dashboard")
        return false;
      });
  }
}
