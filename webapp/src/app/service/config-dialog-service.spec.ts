import { TestBed } from '@angular/core/testing';
import { ConfigDialogService } from './config-dialog-service';
import { Subscription } from 'rxjs';

describe('ConfigDialogService', () => {
  let service: ConfigDialogService;
  let subscription: Subscription;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfigDialogService],
    });
    service = TestBed.inject(ConfigDialogService);
  });

  afterEach(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isOpen$ should be an observable', () => {
    expect(service.isOpen$).toBeDefined();
    expect(typeof service.isOpen$.subscribe).toBe('function');
  });

  it('should emit true when openDialog is called', (done) => {
    subscription = service.isOpen$.subscribe((isOpen) => {
      expect(isOpen).toBe(true);
      done();
    });

    service.openDialog();
  });

  it('should emit false when closeDialog is called', (done) => {
    subscription = service.isOpen$.subscribe((isOpen) => {
      expect(isOpen).toBe(false);
      done();
    });

    service.closeDialog();
  });

  it('should emit multiple values in sequence', () => {
    const emittedValues: boolean[] = [];

    subscription = service.isOpen$.subscribe((isOpen) => {
      emittedValues.push(isOpen);
    });

    service.openDialog();
    service.closeDialog();
    service.openDialog();
    service.closeDialog();

    expect(emittedValues).toEqual([true, false, true, false]);
  });

  it('should allow multiple subscribers to receive the same values', () => {
    const subscriber1Values: boolean[] = [];
    const subscriber2Values: boolean[] = [];

    const sub1 = service.isOpen$.subscribe((isOpen) => {
      subscriber1Values.push(isOpen);
    });

    const sub2 = service.isOpen$.subscribe((isOpen) => {
      subscriber2Values.push(isOpen);
    });

    service.openDialog();
    service.closeDialog();

    expect(subscriber1Values).toEqual([true, false]);
    expect(subscriber2Values).toEqual([true, false]);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });
});
