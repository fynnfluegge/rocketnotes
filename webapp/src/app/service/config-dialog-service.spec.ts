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

  it('should emit correct sequence when open and close are called', () => {
    const emissions: boolean[] = [];

    subscription = service.isOpen$.subscribe((isOpen) => {
      emissions.push(isOpen);
    });

    service.openDialog();
    service.closeDialog();
    service.openDialog();

    expect(emissions).toEqual([true, false, true]);
  });

  it('should allow multiple subscribers to receive emissions', () => {
    const emissions1: boolean[] = [];
    const emissions2: boolean[] = [];

    const sub1 = service.isOpen$.subscribe((isOpen) => {
      emissions1.push(isOpen);
    });

    const sub2 = service.isOpen$.subscribe((isOpen) => {
      emissions2.push(isOpen);
    });

    service.openDialog();
    service.closeDialog();

    expect(emissions1).toEqual([true, false]);
    expect(emissions2).toEqual([true, false]);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });
});
