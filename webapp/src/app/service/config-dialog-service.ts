import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConfigDialogService {
  private isOpenSubject = new Subject<boolean>();
  isOpen$ = this.isOpenSubject.asObservable();

  openDialog() {
    this.isOpenSubject.next(true);
  }

  closeDialog() {
    this.isOpenSubject.next(false);
  }
}
