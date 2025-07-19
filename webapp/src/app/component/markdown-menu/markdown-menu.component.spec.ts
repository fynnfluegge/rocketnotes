import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarkdownMenuComponent } from './markdown-menu.component';
import { AudioRecordingService } from 'src/app/service/audio-recording.service';
import { of } from 'rxjs';

class MockAudioRecordingService {
  getRecordedBlob() {
    return of({ blob: new Blob() });
  }
  startRecording() {}
  stopRecording() {}
}

describe('MarkdownMenuComponent', () => {
  let component: MarkdownMenuComponent;
  let fixture: ComponentFixture<MarkdownMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MarkdownMenuComponent],
      providers: [
        { provide: AudioRecordingService, useClass: MockAudioRecordingService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
