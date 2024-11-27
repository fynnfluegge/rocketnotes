import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { from, Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * This will append jwt token for the http requests.
 *
 * @export
 * @class JwtInterceptor
 * @implements {HttpInterceptor}
 */
@Injectable({
  providedIn: 'root',
})
export class JwtInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return environment.production
      ? from(fetchAuthSession()).pipe(
          switchMap((auth: any) => {
            let jwt = auth.accessToken.jwtToken;

            let with_auth_request = request.clone({
              setHeaders: {
                Authorization: `Bearer ${jwt}`,
              },
            });
            return next.handle(with_auth_request);
          }),
          catchError((err) => {
            console.log('Error ', err);
            return next.handle(request);
          }),
        )
      : next.handle(request);
  }
}
