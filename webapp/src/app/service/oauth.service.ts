import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OAuthService {
  constructor(private http: HttpClient) {}

  handleGoogleCallback(code: string) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    return this.http.post(`${environment.apiUrl}/google-oauth`, { code }, { headers });
  }

  handleGithubCallback(code: string) {
    return this.http.post(`${environment.apiUrl}/github-oauth`, { code });
  }
}
