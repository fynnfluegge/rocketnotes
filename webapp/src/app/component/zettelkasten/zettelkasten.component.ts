import { Component, HostListener, Input, OnInit } from '@angular/core';
import { Document } from 'src/app/model/document.model';
import { Zettel } from 'src/app/model/zettel.model';
import { AudioRecordingService } from 'src/app/service/audio-recording.service';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { environment } from 'src/environments/environment';
import { v4 } from 'uuid';
import OpenAI from 'openai';

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
  speechToTextEnabled: boolean = false;

  isRecording = false;
  isTooltipVisible = false;

  vibeGenerateResponse = [];

  constructor(
    private basicRestService: BasicRestService,
    private audioRecordingService: AudioRecordingService,
  ) {
    this.llmEnabled = localStorage.getItem('config') !== null;
    const config = JSON.parse(localStorage.getItem('config'));
    if (
      config &&
      config.openAiApiKey &&
      config.speechToTextModel === 'Whisper'
    ) {
      this.speechToTextEnabled = true;
      this.openai = new OpenAI({
        apiKey: config.openAiApiKey,
        dangerouslyAllowBrowser: true,
      });
    }
    this.audioRecordingService.getRecordedBlob().subscribe(async (data) => {
      let metadata = {
        type: 'audio/mp3',
      };
      let file = new File([data.blob], 'test.mp3', metadata);
      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
      });

      this.textareaContent += transcription.text + '\n';
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
    const id = v4();
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

  recordNote() {
    this.startRecording();
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
            .subscribe();
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

  ngOnDestroy(): void {
    this.abortRecording();
  }

  agenticMode(): void {
    this.openAgenticModeDialog();
  }

  handleMouseEnterOnTooltipTrigger = (tooltipTrigger: Element) => {
    const tooltipContent: HTMLElement =
      tooltipTrigger.querySelector('.tooltip-content');
    this.positionTooltip(tooltipContent, tooltipTrigger);
  };

  openAgenticModeDialog() {
    const overlay = document.getElementById('agenticDialog');
    overlay.style.display = 'flex';
    if (overlay.getAttribute('outsideClickListener') !== 'true') {
      overlay.addEventListener('click', (event) => {
        overlay.setAttribute('outsideClickListener', 'true');
        this.outsideClickHandler(event);
      });

      const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
      tooltipTriggers.forEach((tooltipTrigger) => {
        tooltipTrigger.addEventListener('mouseenter', () => {
          this.handleMouseEnterOnTooltipTrigger(tooltipTrigger);
        });
      });

      const cardGrid = document.querySelector('.card-grid') as HTMLElement;
      if (cardGrid) {
        cardGrid.scrollTop = 0;
      }
    }
    this.basicRestService
      .get('vibe/generate/' + localStorage.getItem('currentUserId'))
      .subscribe((result) => {
        this.vibeGenerateResponse = JSON.parse(JSON.stringify(result));
        this.vibeGenerateResponse.forEach((item) => {
          this.basicRestService
            .get('document/' + item.documentId)
            .subscribe((result) => {
              const _document: Document = JSON.parse(JSON.stringify(result));
              this.tooltips.set(
                item.documentId,
                _document.title + '\n' + _document.content,
              );
            });
        });
      });
  }

  confirmAgenticFlow() {
    const overlay = document.getElementById('agenticDialog');
    if (overlay) {
      overlay.style.display = 'none';
      this.tooltips.clear();
    }
    this.basicRestService
      .post('vibe/insert', this.vibeGenerateResponse)
      .subscribe();
  }

  outsideClickHandler(event: MouseEvent) {
    const overlay = document.getElementById('agenticDialog');
    if (event.target === overlay) {
      overlay.style.display = 'none';
      this.tooltips.clear();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeDialogs() {
    const overlay = document.getElementById('agenticDialog');
    if (overlay) {
      overlay.style.display = 'none';
      this.tooltips.clear();
    }
  }

  positionTooltip(tooltip: HTMLElement, trigger: Element) {
    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate available space
    const spaceBottom = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    // Determine the best position
    let position = 'right';
    let maxSpace = spaceRight;

    if (spaceLeft > maxSpace) {
      position = 'left';
      maxSpace = spaceLeft;
    }

    // Apply the position class
    tooltip.classList.remove('top', 'bottom', 'left', 'right');
    tooltip.classList.add(position);

    if (spaceBottom < 400) {
      tooltip.classList.add('bottom');
    }
  }
}
