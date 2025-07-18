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
  currentEmbeddingModel: string;
  selectedEmbeddingModel: string = 'text-embedding-ada-002';
  embeddingModels: string[] = [
    'text-embedding-ada-002',
    'text-embedding-3-small',
    'voyage-2',
    'voyage-3',
    'together-m2-bert-80M',
  ];
  selectedSpeechToTextModel: string = 'none';
  speechToTextModels: string[] = ['Whisper', 'none'];
  selectedLlm: string = 'gpt-4-turbo';
  llms: string[] = [
    'gpt-4-turbo',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'claude-sonnet-4-20250514',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-haiku-20241022',
    'together-meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
    'together-Qwen/QwQ-32B',
  ];
  openAiApiKey: string;
  anthropicApiKey: string;
  voyageApiKey: string;
  togetherApiKey: string;
  isLocal: boolean = !environment.production;

  constructor(
    private configDialogService: ConfigDialogService,
    private restService: BasicRestService,
  ) {}

  ngOnInit(): void {
    if (this.isLocal) {
      this.embeddingModels.push('Sentence-Transformers');
      this.embeddingModels.push('Ollama-nomic-embed-text');
      this.llms.push('Ollama-llama3');
      this.llms.push('Ollama-llama2');
      this.llms.push('Ollama-mistral');
      this.llms.push('Ollama-orca-mini');
    }
    this.subscription = this.configDialogService.isOpen$.subscribe((isOpen) => {
      this.isOpen = isOpen;
      if (isOpen) {
        this.restService
          .get('userConfig/' + localStorage.getItem('currentUserId'))
          .subscribe(
            (res) => {
              const config = JSON.parse(JSON.stringify(res));
              if (config['embeddingModel']) {
                this.currentEmbeddingModel = config['embeddingModel'];
                this.selectedEmbeddingModel = config['embeddingModel'];
              }
              if (config['llm']) {
                this.selectedLlm = config['llm'];
              }
              if (config['speechToTextModel']) {
                this.selectedSpeechToTextModel = config['speechToTextModel'];
              }
              this.openAiApiKey = config['openAiApiKey'] ?? '';
              this.anthropicApiKey = config['anthropicApiKey'] ?? '';
              this.voyageApiKey = config['voyageApiKey'] ?? '';
              this.togetherApiKey = config['togetherApiKey'] ?? '';
            },
            (error) => {
              if (error.status === 404) {
                console.error('User config not found (404)');
              } else {
                console.error('An error occurred', error);
              }
            },
          );
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
    this.subscription.unsubscribe();
  }

  submit() {
    if (
      (this.selectedEmbeddingModel === 'text-embeddings-ada-002' ||
        this.selectedLlm.startsWith('gpt') ||
        this.selectedSpeechToTextModel === 'Whisper') &&
      !this.openAiApiKey
    ) {
      const openAiApiKeyRequiredWarning = document.getElementById(
        'openAiApiKeyRequired',
      );
      openAiApiKeyRequiredWarning.style.display = 'block';
    } else if (this.selectedLlm.startsWith('claude') && !this.anthropicApiKey) {
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

      if (this.selectedEmbeddingModel === 'voyage-2' && !this.voyageApiKey) {
        const voyageApiKeyRequiredWarning = document.getElementById(
          'voyageApiKeyRequired',
        );
        voyageApiKeyRequiredWarning.style.display = 'block';
        return;
      } else {
        const voyageApiKeyRequiredWarning = document.getElementById(
          'voyageApiKeyRequired',
        );
        voyageApiKeyRequiredWarning.style.display = 'none';
      }

      if (
        (this.selectedEmbeddingModel === 'together-m2-bert-80M' ||
          this.selectedLlm.startsWith('together-')) &&
        !this.togetherApiKey
      ) {
        const togetherApiKeyRequiredWarning = document.getElementById(
          'togetherApiKeyRequired',
        );
        togetherApiKeyRequiredWarning.style.display = 'block';
        return;
      } else {
        const togetherApiKeyRequiredWarning = document.getElementById(
          'togetherApiKeyRequired',
        );
        togetherApiKeyRequiredWarning.style.display = 'none';
      }

      this.restService
        .post('userConfig', {
          id: localStorage.getItem('currentUserId'),
          embeddingModel: this.selectedEmbeddingModel,
          llm: this.selectedLlm,
          speechToTextModel: this.selectedSpeechToTextModel,
          openAiApiKey: this.openAiApiKey,
          anthropicApiKey: this.anthropicApiKey,
          voyageApiKey: this.voyageApiKey,
          togetherApiKey: this.togetherApiKey,
          recreateIndex:
            this.currentEmbeddingModel !== this.selectedEmbeddingModel,
        })
        .subscribe(() => {
          localStorage.setItem(
            'config',
            JSON.stringify({
              embeddingModel: this.selectedEmbeddingModel,
              llm: this.selectedLlm,
              speechToTextModel: this.selectedSpeechToTextModel,
              openAiApiKey: this.openAiApiKey,
              anthropicApiKey: this.anthropicApiKey,
              voyageApiKey: this.voyageApiKey,
              togetherApiKey: this.togetherApiKey,
            }),
          );
          if (
            this.currentEmbeddingModel !== this.selectedEmbeddingModel &&
            !environment.production
          ) {
            this.restService
              .post('vector-embeddings', {
                Records: [
                  {
                    body: {
                      userId: localStorage.getItem('currentUserId'),
                      recreateIndex: true,
                    },
                  },
                ],
              })
              .subscribe();
          }
        });

      this.configDialogService.closeDialog();
    }
  }

  closeDialog() {
    this.configDialogService.closeDialog();
  }
}
