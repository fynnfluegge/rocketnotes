import { Injectable } from '@angular/core';
import * as moment from 'moment';
import * as RecordRTC from 'recordrtc';
import { Observable, Subject } from 'rxjs';

interface RecordedAudioOutput {
  blob: Blob;
  title: string;
}

@Injectable({
  providedIn: 'root',
})
export class AudioRecordingService {
  private stream: MediaStream;
  private recorder: {
    record: () => void;
    stop: (arg0: (blob: any) => void, arg1: () => void) => void;
  };
  private interval: string | number | NodeJS.Timeout;
  private startTime: any;
  private _recorded = new Subject<RecordedAudioOutput>();
  private _recordingTime = new Subject<string>();

  getRecordedBlob(): Observable<RecordedAudioOutput> {
    return this._recorded.asObservable();
  }

  getRecordedTime(): Observable<string> {
    return this._recordingTime.asObservable();
  }

  startRecording() {
    if (this.recorder) {
      // It means recording is already started or it is already recording something
      return;
    }

    this._recordingTime.next('00:00');
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        this.stream = s;
        this.record();
      })
      .catch((error) => {});
  }

  abortRecording() {
    this.stopMedia();
  }

  private record() {
    this.recorder = new RecordRTC.StereoAudioRecorder(this.stream, {
      type: 'audio',
      mimeType: 'audio/webm',
    });

    this.recorder.record();
    this.startTime = moment;
    this.interval = setInterval(() => {
      const currentTime = moment();
      const diffTime = moment.duration(currentTime.diff(this.startTime));
      const time =
        this.toString(diffTime.minutes()) +
        ':' +
        this.toString(diffTime.seconds());
      this._recordingTime.next(time);
    }, 1000);
  }

  private toString(value) {
    let val = value;
    if (!value) val = '00';
    if (value < 10) val = '0' + value;
    return val;
  }

  stopRecording() {
    if (this.recorder) {
      this.recorder.stop(
        (blob) => {
          if (this.startTime) {
            const mp3Name = encodeURIComponent(
              'audio_' + new Date().getTime() + '.mp3',
            );
            this.stopMedia();
            this._recorded.next({ blob: blob, title: mp3Name });
          }
        },
        () => {
          this.stopMedia();
        },
      );
    }
  }

  private stopMedia() {
    if (this.recorder) {
      this.recorder = null;
      clearInterval(this.interval);
      this.startTime = null;
      if (this.stream) {
        this.stream.getAudioTracks().forEach((track) => track.stop());
        this.stream = null;
      }
    }
  }
}
