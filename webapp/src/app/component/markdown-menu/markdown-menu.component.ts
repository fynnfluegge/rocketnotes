import { Component, EventEmitter, Output } from '@angular/core';
import { AudioRecordingService } from 'src/app/service/audio-recording.service';
import OpenAI from 'openai';

@Component({
  selector: 'app-markdown-menu',
  templateUrl: './markdown-menu.component.html',
  styleUrls: ['./markdown-menu.component.scss']
})
export class MarkdownMenuComponent {
  @Output() applyMarkdown = new EventEmitter<string>();
  @Output() transcribedText = new EventEmitter<string>();

  isRecording = false;
  speechToTextEnabled = false;
  private openai: OpenAI;

  constructor(private audioRecordingService: AudioRecordingService) {
    const config = JSON.parse(localStorage.getItem('config'));
    if (config && config.openAiApiKey && config.speechToTextModel === 'Whisper') {
      this.speechToTextEnabled = true;
      this.openai = new OpenAI({
        apiKey: config.openAiApiKey,
        dangerouslyAllowBrowser: true
      });
    }
    this.audioRecordingService.getRecordedBlob().subscribe(async (data) => {
      let metadata = {
        type: 'audio/mp3'
      };
      let file = new File([data.blob], 'test.mp3', metadata);
      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1'
      });
      this.transcribedText.emit(transcription.text);
    });
  }

  applyStyle(style: string) {
    this.applyMarkdown.emit(style);
  }

  recordNote() {
    if (!this.isRecording) {
      this.isRecording = true;
      this.audioRecordingService.startRecording();
    }
  }

  stopRecord() {
    if (this.isRecording) {
      this.isRecording = false;
      this.audioRecordingService.stopRecording();
    }
  }
}