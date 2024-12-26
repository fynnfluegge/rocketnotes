import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicDocumentViewerComponent } from './public-document-viewer.component';

describe('PublicDocumentViewerComponent', () => {
  let component: PublicDocumentViewerComponent;
  let fixture: ComponentFixture<PublicDocumentViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PublicDocumentViewerComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicDocumentViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
