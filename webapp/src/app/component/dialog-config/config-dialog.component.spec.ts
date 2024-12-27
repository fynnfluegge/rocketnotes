import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigDialogComponent } from './config-dialog.component';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

describe('ConfigDialogComponent', () => {
  let component: ConfigDialogComponent;
  let fixture: ComponentFixture<ConfigDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConfigDialogComponent],
    }).compileComponents();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConfigDialogComponent],
      imports: [HttpClientModule, FormsModule],
      providers: [BasicRestService],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfigDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
