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
  let windowLocationAssignSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthGuard],
    });

    guard = TestBed.inject(AuthGuard);
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {} as RouterStateSnapshot;

    // Store original environment values
    originalProduction = environment.production;
    originalAuthGuardRedirect = environment.authGuardRedirect;

    // Mock window.location.assign
    windowLocationAssignSpy = spyOn(window.location, 'assign');
  });

  afterEach(() => {
    // Restore original environment values
    environment.production = originalProduction;
    environment.authGuardRedirect = originalAuthGuardRedirect;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('non-production environment', () => {
    beforeEach(() => {
      environment.production = false;
    });

    it('should return true immediately when not in production', () => {
      const result = guard.canActivate(mockRoute, mockState);
      expect(result).toBe(true);
    });

    it('should not call Auth.currentAuthenticatedUser when not in production', () => {
      const authSpy = spyOn(Auth, 'currentAuthenticatedUser');

      guard.canActivate(mockRoute, mockState);

      expect(authSpy).not.toHaveBeenCalled();
    });

    it('should not redirect when not in production', () => {
      guard.canActivate(mockRoute, mockState);

      expect(windowLocationAssignSpy).not.toHaveBeenCalled();
    });
  });

  describe('production environment', () => {
    beforeEach(() => {
      environment.production = true;
      environment.authGuardRedirect = 'https://auth.example.com/login';
    });

    it('should call Auth.currentAuthenticatedUser in production', async () => {
      const authSpy = spyOn(Auth, 'currentAuthenticatedUser').and.returnValue(
        Promise.resolve({ username: 'testuser' }),
      );

      await guard.canActivate(mockRoute, mockState);

      expect(authSpy).toHaveBeenCalled();
    });

    describe('authenticated user', () => {
      beforeEach(() => {
        spyOn(Auth, 'currentAuthenticatedUser').and.returnValue(
          Promise.resolve({ username: 'testuser' }),
        );
      });

      it('should return true when user is authenticated', async () => {
        const result = await guard.canActivate(mockRoute, mockState);
        expect(result).toBe(true);
      });

      it('should not redirect when user is authenticated', async () => {
        await guard.canActivate(mockRoute, mockState);
        expect(windowLocationAssignSpy).not.toHaveBeenCalled();
      });
    });

    describe('unauthenticated user', () => {
      beforeEach(() => {
        spyOn(Auth, 'currentAuthenticatedUser').and.returnValue(
          Promise.reject(new Error('No current user')),
        );
      });

      it('should return false when user is not authenticated', async () => {
        const result = await guard.canActivate(mockRoute, mockState);
        expect(result).toBe(false);
      });

      it('should redirect to authGuardRedirect URL when not authenticated', async () => {
        await guard.canActivate(mockRoute, mockState);

        expect(windowLocationAssignSpy).toHaveBeenCalledWith(
          'https://auth.example.com/login',
        );
      });

      it('should redirect to configured authGuardRedirect URL', async () => {
        environment.authGuardRedirect = 'https://custom-auth.example.com/signin';

        await guard.canActivate(mockRoute, mockState);

        expect(windowLocationAssignSpy).toHaveBeenCalledWith(
          'https://custom-auth.example.com/signin',
        );
      });
    });
  });
});
