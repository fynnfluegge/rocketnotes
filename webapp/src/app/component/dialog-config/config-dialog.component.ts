import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { ConfigDialogService } from 'src/app/service/config-dialog-service';
import { environment } from 'src/environments/environment';
import { Auth } from 'aws-amplify';

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
  selectedLlm: string = 'gpt-3.5-turbo';
  openAiApiKey: string;
  anthropicApiKey: string;
  isLocal: boolean = !environment.production;

  constructor(
    private configDialogService: ConfigDialogService,
    private restService: BasicRestService,
  ) {}

  ngOnInit(): void {
    this.subscription = this.configDialogService.isOpen$.subscribe((isOpen) => {
      this.isOpen = isOpen;
      if (isOpen) {
        if (localStorage.getItem('config')) {
          const config = JSON.parse(localStorage.getItem('config'));
          if (config['embeddingModel']) {
            this.currentEmbeddingModel = config['embeddingModel'];
            this.selectedEmbeddingModel = config['embeddingModel'];
          }
          if (config['llm']) {
            this.selectedLlm = config['llm'];
          }
          if (config['openAiApiKey']) {
            this.openAiApiKey = config['openAiApiKey'];
          }
          if (config['anthropicApiKey']) {
            this.anthropicApiKey = config['anthropicApiKey'];
          }
        }
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
        this.selectedLlm.startsWith('gpt')) &&
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
      this.restService
        .post('userConfig', {
          id: localStorage.getItem('currentUserId'),
          embeddingModel: this.selectedEmbeddingModel,
          llm: this.selectedLlm,
          openAiApiKey: this.openAiApiKey,
          anthropicApiKey: this.anthropicApiKey,
          recreateIndex:
            this.currentEmbeddingModel !== this.selectedEmbeddingModel,
        })
        .subscribe(() => {
          if (environment.production) {
            Auth.currentAuthenticatedUser().then((user) => {
              Auth.updateUserAttributes(user, {
                'custom:config': '1',
              });
            });
          }
          localStorage.setItem(
            'config',
            JSON.stringify({
              embeddingModel: this.selectedEmbeddingModel,
              llm: this.selectedLlm,
              openAiApiKey: this.openAiApiKey,
              anthropicApiKey: this.anthropicApiKey,
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
