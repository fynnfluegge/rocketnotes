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

  it('should emit values in correct sequence', () => {
    const emittedValues: boolean[] = [];

    service.isOpen$.subscribe((value) => {
      emittedValues.push(value);
    });

    service.openDialog();
    service.closeDialog();
    service.openDialog();

    expect(emittedValues).toEqual([true, false, true]);
  });

  it('should not emit any value before methods are called', () => {
    const emittedValues: boolean[] = [];

    service.isOpen$.subscribe((value) => {
      emittedValues.push(value);
    });

    expect(emittedValues).toEqual([]);
  });
});
