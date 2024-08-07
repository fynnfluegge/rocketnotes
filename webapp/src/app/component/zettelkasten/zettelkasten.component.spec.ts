import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZettelkastenComponent } from './zettelkasten.component';

describe('ZettelkastenComponent', () => {
  let component: ZettelkastenComponent;
  let fixture: ComponentFixture<ZettelkastenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ZettelkastenComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZettelkastenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
