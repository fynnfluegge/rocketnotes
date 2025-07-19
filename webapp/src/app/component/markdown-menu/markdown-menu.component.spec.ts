import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkdownMenuComponent } from './markdown-menu.component';

describe('MarkdownMenuComponent', () => {
  let component: MarkdownMenuComponent;
  let fixture: ComponentFixture<MarkdownMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkdownMenuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarkdownMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
