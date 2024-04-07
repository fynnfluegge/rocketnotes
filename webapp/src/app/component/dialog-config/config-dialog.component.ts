import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { ConfigDialogService } from 'src/app/service/config-dialog-service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-config-dialog',
  templateUrl: './config-dialog.component.html',
  styleUrls: ['./config-dialog.component.scss'],
})
export class ConfigDialogComponent implements OnDestroy, OnInit {
  subscription: Subscription;
  isOpen: boolean = false;
  currentEmbeddingsModel: string;
  selectedEmbeddingsModel: string = 'text-embeddings-ada-002';
  selectedLlmModel: string = 'gpt-3.5-turbo';
  openAiApiKey: string;
  anthropicApiKey: string;

  constructor(
    private configDialogService: ConfigDialogService,
    private restService: BasicRestService,
  ) {
    this.subscription = this.configDialogService.isOpen$.subscribe((isOpen) => {
      this.isOpen = isOpen;
      if (isOpen) {
        this.restService
          .get('userConfig/' + localStorage.getItem('currentUserId'))
          .subscribe((config) => {
            this.currentEmbeddingsModel = config['embeddingsModel'];
            this.selectedEmbeddingsModel = config['embeddingsModel'];
            this.selectedLlmModel = config['llmModel'];
            this.openAiApiKey = config['openAiApiKey'];
            this.anthropicApiKey = config['anthropicApiKey'];
          });
        const overlay = document.getElementById('configDialog');
        if (overlay.getAttribute('outsideClickListener') !== 'true') {
          overlay.addEventListener('click', (event) => {
            overlay.setAttribute('outsideClickListener', 'true');
            if (event.target === overlay) {
              this.configDialogService.closeDialog();
            }
          });
        }
      }
    });
  }

  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }

  ngOnInit(): void {}

  submit() {
    if (
      (this.selectedEmbeddingsModel === 'text-embeddings-ada-002' ||
        this.selectedLlmModel === 'gpt-3.5-turbo' ||
        this.selectedLlmModel === 'gpt-4') &&
      !this.openAiApiKey
    ) {
      const openAiApiKeyRequiredWarning = document.getElementById(
        'openAiApiKeyRequired',
      );
      openAiApiKeyRequiredWarning.style.display = 'block';
    } else if (this.selectedLlmModel.startsWith('claude')) {
      const anthropicApiKeyRequiredWarning = document.getElementById(
        'anthropicApiKeyRequired',
      );
      anthropicApiKeyRequiredWarning.style.display = 'block';
      const openAiApiKeyRequiredWarning = document.getElementById(
        'openAiApiKeyRequired',
      );
      openAiApiKeyRequiredWarning.style.display = 'none';
    } else {
      const anthropicApiKeyRequiredWarning = document.getElementById(
        'anthropicApiKeyRequired',
      );
      anthropicApiKeyRequiredWarning.style.display = 'none';
      this.restService
        .get('/userConfig', {
          userId: localStorage.getItem('currentUserId'),
          embeddingsModel: this.selectedEmbeddingsModel,
          llmModel: this.selectedLlmModel,
          openAiApiKey: this.openAiApiKey,
          anthropicApiKey: this.anthropicApiKey,
          recreateIndex:
            this.currentEmbeddingsModel !== this.selectedEmbeddingsModel,
        })
        .subscribe(() => {
          if (
            this.currentEmbeddingsModel !== this.selectedEmbeddingsModel &&
            !environment.production
          ) {
            this.restService
              .get('/vector-embeddings', {
                Records: [
                  {
                    body: {
                      userId: localStorage.getItem('currentUserId'),
                      openAiApiKey: this.openAiApiKey,
                      anthropicApiKey: this.anthropicApiKey,
                      recreateIndex: true,
                    },
                  },
                ],
              })
              .subscribe(() => {
                this.configDialogService.closeDialog();
              });
          }
        });

      this.configDialogService.closeDialog();
    }
  }

  closeDialog() {
    this.configDialogService.closeDialog();
  }
}
