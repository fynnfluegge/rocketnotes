import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OAuthService } from '../../service/oauth.service';
import Auth from '@aws-amplify/auth';

@Component({
  selector: 'app-oauth-callback',
  template: '<div>Processing login...</div>'
})
export class OAuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private oauthService: OAuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];

      if (code) {
        if (state === 'google') {
          this.handleGoogleCallback(code);
        } else if (state === 'github') {
          this.handleGithubCallback(code);
        }
      }
    });
  }

  private handleGoogleCallback(code: string) {
    this.oauthService.handleGoogleCallback(code).subscribe(
      async (response: any) => {
        // Handle successful login
        await Auth.federatedSignIn(
          'Google',
          { token: response.token, expires_at: 3600 },
          { email: response.email, name: response.name }
        );
        this.router.navigate(['/']);
      },
      error => {
        console.error('Google OAuth error:', error);
        this.router.navigate(['/login']);
      }
    );
  }

  private handleGithubCallback(code: string) {
    this.oauthService.handleGithubCallback(code).subscribe(
      async (response: any) => {
        // Handle successful login
        await Auth.federatedSignIn(
          'GitHub',
          { token: response.token, expires_at: 3600 },
          { email: response.email, name: response.name }
        );
        this.router.navigate(['/']);
      },
      error => {
        console.error('GitHub OAuth error:', error);
        this.router.navigate(['/login']);
      }
    );
  }
}
