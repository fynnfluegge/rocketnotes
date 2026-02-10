import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthGuard } from './auth-guard.guard';
import Auth from '@aws-amplify/auth';
import { environment } from '../../../environments/environment';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let originalProduction: boolean;
  let originalAuthGuardRedirect: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthGuard],
    });
    guard = TestBed.inject(AuthGuard);
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {} as RouterStateSnapshot;

    originalProduction = environment.production;
    originalAuthGuardRedirect = environment.authGuardRedirect;
  });

  afterEach(() => {
    (environment as { production: boolean }).production = originalProduction;
    (environment as { authGuardRedirect: string }).authGuardRedirect = originalAuthGuardRedirect;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('in development mode', () => {
    beforeEach(() => {
      (environment as { production: boolean }).production = false;
    });

    it('should return true immediately', () => {
      const result = guard.canActivate(mockRoute, mockState);
      expect(result).toBe(true);
    });

    it('should not call Auth.currentAuthenticatedUser', () => {
      const authSpy = spyOn(Auth, 'currentAuthenticatedUser');

      guard.canActivate(mockRoute, mockState);

      expect(authSpy).not.toHaveBeenCalled();
    });
  });

  describe('in production mode', () => {
    beforeEach(() => {
      (environment as { production: boolean }).production = true;
      (environment as { authGuardRedirect: string }).authGuardRedirect = 'https://login.example.com';
    });

    it('should return true when user is authenticated', async () => {
      spyOn(Auth, 'currentAuthenticatedUser').and.returnValue(Promise.resolve({}));

      const result = await guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
    });

    it('should call Auth.currentAuthenticatedUser in production mode', async () => {
      const authSpy = spyOn(Auth, 'currentAuthenticatedUser').and.returnValue(Promise.resolve({}));

      await guard.canActivate(mockRoute, mockState);

      expect(authSpy).toHaveBeenCalled();
    });
  });
});
