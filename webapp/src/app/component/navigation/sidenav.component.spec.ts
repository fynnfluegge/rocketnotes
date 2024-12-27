import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenavComponent } from './sidenav.component';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { DocumentTree } from 'src/app/service/document-tree-service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';

describe('SidenavComponent', () => {
  let component: SidenavComponent;
  let fixture: ComponentFixture<SidenavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SidenavComponent],
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
    fixture = TestBed.createComponent(SidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
