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

  it('should have isOpen$ observable', () => {
    expect(service.isOpen$).toBeTruthy();
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

  it('should emit multiple state changes in sequence', () => {
    const emissions: boolean[] = [];

    service.isOpen$.subscribe((isOpen) => {
      emissions.push(isOpen);
    });

    service.openDialog();
    service.closeDialog();
    service.openDialog();

    expect(emissions).toEqual([true, false, true]);
  });
});
