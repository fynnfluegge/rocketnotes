import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZettelkastenComponent } from './zettelkasten.component';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { HttpClientModule } from '@angular/common/http';

describe('ZettelkastenComponent', () => {
  let component: ZettelkastenComponent;
  let fixture: ComponentFixture<ZettelkastenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ZettelkastenComponent],
      imports: [HttpClientModule],
      providers: [BasicRestService],
    }).compileComponents();

    fixture = TestBed.createComponent(ZettelkastenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
