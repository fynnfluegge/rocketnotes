import { TestBed } from '@angular/core/testing';
import { ConfigDialogService } from './config-dialog-service';

describe('ConfigDialogService', () => {
  let service: ConfigDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfigDialogService],
    });
    service = TestBed.inject(ConfigDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit true when openDialog is called', (done) => {
    service.isOpen$.subscribe((value) => {
      expect(value).toBe(true);
      done();
    });

    service.openDialog();
  });

  it('should emit false when closeDialog is called', (done) => {
    service.isOpen$.subscribe((value) => {
      expect(value).toBe(false);
      done();
    });

    service.closeDialog();
  });

  it('should emit values in correct sequence for open and close', () => {
    const emittedValues: boolean[] = [];

    service.isOpen$.subscribe((value) => {
      emittedValues.push(value);
    });

    service.openDialog();
    service.closeDialog();
    service.openDialog();

    expect(emittedValues).toEqual([true, false, true]);
  });

  it('should allow multiple subscribers to receive values', () => {
    const subscriber1Values: boolean[] = [];
    const subscriber2Values: boolean[] = [];

    service.isOpen$.subscribe((value) => {
      subscriber1Values.push(value);
    });

    service.isOpen$.subscribe((value) => {
      subscriber2Values.push(value);
    });

    service.openDialog();
    service.closeDialog();

    expect(subscriber1Values).toEqual([true, false]);
    expect(subscriber2Values).toEqual([true, false]);
  });
});
