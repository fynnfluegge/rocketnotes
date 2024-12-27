import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicDocumentViewerComponent } from './public-document-viewer.component';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs/internal/observable/of';

describe('PublicDocumentViewerComponent', () => {
  let component: PublicDocumentViewerComponent;
  let fixture: ComponentFixture<PublicDocumentViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PublicDocumentViewerComponent],
      imports: [HttpClientModule],
      providers: [
        BasicRestService,
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '123' }),
            paramMap: of({
              get: () => '123',
            }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PublicDocumentViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
