import { Component, Input, OnInit } from '@angular/core';
import { Document } from 'src/app/model/document.model';
import { Zettel } from 'src/app/model/zettel.model';
import { AudioRecordingService } from 'src/app/service/audio-recording.service';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { environment } from 'src/environments/environment';
import * as uuid from 'uuid';
import { DomSanitizer } from '@angular/platform-browser';
import OpenAI from 'openai';
import * as fs from 'fs';

@Component({
  selector: 'app-zettelkasten',
  templateUrl: './zettelkasten.component.html',
  styleUrls: ['./zettelkasten.component.scss'],
})
export class ZettelkastenComponent implements OnInit {
  @Input() showSidebar: boolean;

  private openai: OpenAI;

  textareaContent: string = '';
  contentMap: Record<string, Zettel> = {};
  editMap: Map<string, boolean> = new Map();
  suggestionMap: Map<string, Document[]> = new Map();
  isLoadingMap: Map<string, boolean> = new Map();
  tooltips: Map<string, string> = new Map();
  llmEnabled: boolean = false;

  isRecording = false;
  recordedTime;
  blobUrl;
  teste;

  constructor(
    private basicRestService: BasicRestService,
    private audioRecordingService: AudioRecordingService,
    private sanitizer: DomSanitizer,
  ) {
    this.llmEnabled = localStorage.getItem('config') !== null;
    const config = JSON.parse(localStorage.getItem('config'));
    if (config.openAiApiKey) {
      this.openai = new OpenAI({
        apiKey: config['openAiApiKey'],
        dangerouslyAllowBrowser: true,
      });
    }
    this.audioRecordingService
      .getRecordedTime()
      .subscribe((time) => (this.recordedTime = time));
    this.audioRecordingService.getRecordedBlob().subscribe((data) => {
      this.teste = data;
      this.blobUrl = this.sanitizer.bypassSecurityTrustUrl(
        URL.createObjectURL(data.blob),
      );
    });
  }

  ngOnInit(): void {
    this.basicRestService
      .get('zettelkasten/' + localStorage.getItem('currentUserId'))
      .subscribe((result) => {
        const jsonResult = JSON.parse(JSON.stringify(result));
        jsonResult.forEach((element: any) => {
          this.contentMap[element.id] = new Zettel(
            element.id,
            element.userId,
            element.content,
            element.created,
          );
          this.editMap.set(element.id, false);
          this.isLoadingMap.set(element.id, false);
        });
      });
  }

  saveNote() {
    const id = uuid.v4();
    if (this.textareaContent.trim()) {
      this.contentMap[id] = new Zettel(
        id,
        localStorage.getItem('currentUserId'),
        this.textareaContent,
        new Date(),
      );
      this.textareaContent = '';
    }
    this.basicRestService
      .post('saveZettel', {
        zettel: this.contentMap[id],
      })
      .subscribe();
  }

  async recordNote() {
    this.startRecording();

    // const transcription = await this.openai.audio.transcriptions.create({
    //   file: fs.createReadStream('german.m4a'),
    //   model: 'whisper-1',
    // });

    // console.log(transcription);
  }

  async stopRecord() {
    this.stopRecording();
  }

  edit(id: string) {
    this.editMap.set(id, true);
  }

  async save(id: string) {
    this.editMap.set(id, false);
    this.basicRestService
      .post('saveZettel', { zettel: this.contentMap[id] })
      .subscribe();
  }

  delete(id: string) {
    this.basicRestService.delete('deleteZettel/' + id).subscribe(() => {
      delete this.contentMap[id];
    });
  }

  async archive(id: string) {
    this.isLoadingMap.set(id, true);
    this.basicRestService
      .post('semanticSearch', {
        userId: localStorage.getItem('currentUserId'),
        searchString: this.contentMap[id].content,
      })
      .subscribe((result) => {
        this.isLoadingMap.set(id, false);
        this.suggestionMap[id] = [];
        const jsonResult = JSON.parse(JSON.stringify(result));
        var dedupList = new Set();
        jsonResult.forEach((element: any) => {
          if (dedupList.has(element.documentId)) {
            return;
          } else {
            dedupList.add(element.documentId);
            this.suggestionMap[id].push(
              new Document(element.documentId, element.title, element.content),
            );
          }
        });
        this.addTooltips(id);
      });
  }

  async addTooltips(id: string) {
    const deletedItems = [];
    this.suggestionMap[id].forEach((value: Document) => {
      this.basicRestService.get('document/' + value.id).subscribe((result) => {
        const _document: Document = JSON.parse(JSON.stringify(result));
        if (_document.deleted) {
          deletedItems.push(id);
        } else {
          this.tooltips.set(
            value.id,
            _document.title + '\n' + _document.content,
          );
        }
      });
    });
    deletedItems.forEach((v) => {
      this.suggestionMap.delete(v);
    });
  }

  insert(id: string, documentId: string) {
    this.basicRestService
      .post('archiveZettel/' + documentId, {
        zettel: this.contentMap[id],
        recreateIndex: environment.production,
      })
      .subscribe(() => {
        this.delete(id);

        if (
          !environment.production &&
          localStorage.getItem('config') !== null
        ) {
          this.basicRestService
            .post('vector-embeddings', {
              Records: [
                {
                  body: {
                    userId: localStorage.getItem('currentUserId'),
                    documentId: documentId,
                    recreateIndex: true,
                  },
                },
              ],
            })
            .subscribe(() => {});
        }
      });
  }

  cancelEdit() {
    for (let key of this.editMap.keys()) {
      this.editMap.set(key, false);
    }
  }

  getTooltip(id: string) {
    if (this.tooltips.has(id)) {
      return this.tooltips.get(id);
    }
  }

  isLoading(id: string) {
    return this.isLoadingMap.get(id);
  }

  startRecording() {
    if (!this.isRecording) {
      this.isRecording = true;
      this.audioRecordingService.startRecording();
    }
  }

  abortRecording() {
    if (this.isRecording) {
      this.isRecording = false;
      this.audioRecordingService.abortRecording();
    }
  }

  stopRecording() {
    if (this.isRecording) {
      this.audioRecordingService.stopRecording();
      this.isRecording = false;
    }
  }

  clearRecordedData() {
    this.blobUrl = null;
  }

  ngOnDestroy(): void {
    this.abortRecording();
  }

  download(): void {
    const url = window.URL.createObjectURL(this.teste.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.teste.title;
    link.click();
  }
}
