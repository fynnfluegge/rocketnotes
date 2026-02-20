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

  it('should not emit an initial value on subscription', () => {
    const values: boolean[] = [];
    const sub = service.isOpen$.subscribe((v) => values.push(v));
    expect(values).toEqual([]);
    sub.unsubscribe();
  });

  it('should emit true when openDialog is called', () => {
    const values: boolean[] = [];
    const sub = service.isOpen$.subscribe((v) => values.push(v));

    service.openDialog();

    expect(values).toEqual([true]);
    sub.unsubscribe();
  });

  it('should emit false when closeDialog is called', () => {
    const values: boolean[] = [];
    const sub = service.isOpen$.subscribe((v) => values.push(v));

    service.closeDialog();

    expect(values).toEqual([false]);
    sub.unsubscribe();
  });

  it('should emit true then false for open/close sequence', () => {
    const values: boolean[] = [];
    const sub = service.isOpen$.subscribe((v) => values.push(v));

    service.openDialog();
    service.closeDialog();

    expect(values).toEqual([true, false]);
    sub.unsubscribe();
  });
});
