import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LlmDialogComponent } from './llm-dialog.component';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DocumentTree } from 'src/app/service/document-tree-service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs/internal/observable/of';

describe('LlmDialogComponent', () => {
  let component: LlmDialogComponent;
  let fixture: ComponentFixture<LlmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LlmDialogComponent],
      imports: [HttpClientModule, FormsModule],
      providers: [
        BasicRestService,
        DocumentTree,
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '123' }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LlmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
