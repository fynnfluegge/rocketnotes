import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorComponent } from './editor.component';
import { HttpClientModule } from '@angular/common/http';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { DocumentTree } from 'src/app/service/document-tree-service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs/internal/observable/of';

describe('EditorComponent', () => {
  let component: EditorComponent;
  let fixture: ComponentFixture<EditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditorComponent],
      imports: [HttpClientModule],
      providers: [
        BasicRestService,
        DocumentTree,
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
    fixture = TestBed.createComponent(EditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
