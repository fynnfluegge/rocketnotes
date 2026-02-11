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
    service.isOpen$.subscribe((isOpen) => {
      expect(isOpen).toBe(true);
      done();
    });

    service.openDialog();
  });

  it('should emit false when closeDialog is called', (done) => {
    service.isOpen$.subscribe((isOpen) => {
      expect(isOpen).toBe(false);
      done();
    });

    service.closeDialog();
  });

  it('should emit values in correct order when opening and closing dialog', () => {
    const emittedValues: boolean[] = [];

    service.isOpen$.subscribe((isOpen) => {
      emittedValues.push(isOpen);
    });

    service.openDialog();
    service.closeDialog();
    service.openDialog();

    expect(emittedValues).toEqual([true, false, true]);
  });

  it('should notify multiple subscribers', () => {
    let subscriber1Value: boolean | undefined;
    let subscriber2Value: boolean | undefined;

    service.isOpen$.subscribe((isOpen) => {
      subscriber1Value = isOpen;
    });

    service.isOpen$.subscribe((isOpen) => {
      subscriber2Value = isOpen;
    });

    service.openDialog();

    expect(subscriber1Value).toBe(true);
    expect(subscriber2Value).toBe(true);
  });
});
