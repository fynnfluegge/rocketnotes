import { TestBed } from '@angular/core/testing';
import { ConfigDialogService } from './config-dialog-service';

describe('ConfigDialogService', () => {
  let service: ConfigDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit true when openDialog is called', () => {
    let emittedValue: boolean | undefined;
    service.isOpen$.subscribe((value) => (emittedValue = value));

    service.openDialog();

    expect(emittedValue).toBeTrue();
  });

  it('should emit false when closeDialog is called', () => {
    let emittedValue: boolean | undefined;
    service.isOpen$.subscribe((value) => (emittedValue = value));

    service.closeDialog();

    expect(emittedValue).toBeFalse();
  });

  it('should emit multiple values in sequence', () => {
    const emittedValues: boolean[] = [];
    service.isOpen$.subscribe((value) => emittedValues.push(value));

    service.openDialog();
    service.closeDialog();
    service.openDialog();

    expect(emittedValues).toEqual([true, false, true]);
  });

  it('should not emit any value before openDialog or closeDialog is called', () => {
    let emitted = false;
    service.isOpen$.subscribe(() => (emitted = true));

    expect(emitted).toBeFalse();
  });
});
