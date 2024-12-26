import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LlmDialogComponent } from './llm-dialog.component';

describe('LlmDialogComponent', () => {
  let component: LlmDialogComponent;
  let fixture: ComponentFixture<LlmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LlmDialogComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LlmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
