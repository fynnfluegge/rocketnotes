import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConfigDialogComponent } from './config-dialog.component';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { ConfigDialogService } from 'src/app/service/config-dialog-service';
import { FormsModule } from '@angular/forms';

describe('ConfigDialogComponent', () => {
  let component: ConfigDialogComponent;
  let fixture: ComponentFixture<ConfigDialogComponent>;
  let mockBasicRestService: any;
  let mockConfigDialogService: any;

  beforeEach(async () => {
    mockBasicRestService = {
      get: jasmine.createSpy('get').and.returnValue(of({
        embeddingModel: 'text-embedding-ada-002',
        llm: 'gpt-4-turbo',
        speechToTextModel: 'none',
        openAiApiKey: 'test-openai-key',
        anthropicApiKey: 'test-anthropic-key',
        voyageApiKey: 'test-voyage-key',
        togetherApiKey: 'test-together-key',
      })),
      post: jasmine.createSpy('post').and.returnValue(of({})),
    };

    mockConfigDialogService = {
      isOpen$: of(true),
      closeDialog: jasmine.createSpy('closeDialog'),
    };

    await TestBed.configureTestingModule({
      declarations: [ConfigDialogComponent],
      imports: [FormsModule],
      providers: [
        { provide: BasicRestService, useValue: mockBasicRestService },
        { provide: ConfigDialogService, useValue: mockConfigDialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Together AI API Key Validation', () => {
    it('should display warning if Together AI LLM is selected and key is missing', () => {
      component.selectedLlm = 'together-meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8';
      component.togetherApiKey = '';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
      expect(warningElement.style.display).toBe('block');
      expect(mockBasicRestService.post).not.toHaveBeenCalled();
    });

    it('should display warning if Together AI embedding model is selected and key is missing', () => {
      component.selectedEmbeddingModel = 'together-m2-bert-80M';
      component.togetherApiKey = '';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
      expect(warningElement.style.display).toBe('block');
      expect(mockBasicRestService.post).not.toHaveBeenCalled();
    });

    it('should hide warning if Together AI LLM is selected and key is present', () => {
      component.selectedLlm = 'together-meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8';
      component.togetherApiKey = 'valid-together-key';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
      expect(warningElement.style.display).toBe('none');
      expect(mockBasicRestService.post).toHaveBeenCalled();
    });

    it('should hide warning if Together AI embedding model is selected and key is present', () => {
      component.selectedEmbeddingModel = 'together-m2-bert-80M';
      component.togetherApiKey = 'valid-together-key';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
      expect(warningElement.style.display).toBe('none');
      expect(mockBasicRestService.post).toHaveBeenCalled();
    });

    it('should not display warning if non-Together AI models are selected', () => {
      component.selectedLlm = 'gpt-4-turbo';
      component.selectedEmbeddingModel = 'text-embedding-ada-002';
      component.togetherApiKey = '';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
      expect(warningElement.style.display).toBe('none');
      expect(mockBasicRestService.post).toHaveBeenCalled();
    });
  });

  describe('OpenAI API Key Validation', () => {
    it('should display warning if GPT LLM is selected and OpenAI key is missing', () => {
      component.selectedLlm = 'gpt-4-turbo';
      component.openAiApiKey = '';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#openAiApiKeyRequired');
      expect(warningElement.style.display).toBe('block');
      expect(mockBasicRestService.post).not.toHaveBeenCalled();
    });

    it('should display warning if Whisper speech-to-text is selected and OpenAI key is missing', () => {
      component.selectedLlm = 'claude-sonnet-4-20250514';
      component.anthropicApiKey = 'valid-key';
      component.selectedSpeechToTextModel = 'Whisper';
      component.openAiApiKey = '';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#openAiApiKeyRequired');
      expect(warningElement.style.display).toBe('block');
      expect(mockBasicRestService.post).not.toHaveBeenCalled();
    });

    it('should hide warning and save if GPT LLM is selected and OpenAI key is present', () => {
      component.selectedLlm = 'gpt-4o';
      component.openAiApiKey = 'valid-openai-key';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#openAiApiKeyRequired');
      expect(warningElement.style.display).toBe('none');
      expect(mockBasicRestService.post).toHaveBeenCalled();
    });
  });

  describe('Anthropic API Key Validation', () => {
    it('should display warning if Claude LLM is selected and Anthropic key is missing', () => {
      component.selectedLlm = 'claude-sonnet-4-20250514';
      component.anthropicApiKey = '';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#anthropicApiKeyRequired');
      expect(warningElement.style.display).toBe('block');
      expect(mockBasicRestService.post).not.toHaveBeenCalled();
    });

    it('should hide OpenAI warning when showing Anthropic warning', () => {
      component.selectedLlm = 'claude-3-7-sonnet-20250219';
      component.anthropicApiKey = '';
      component.openAiApiKey = '';
      fixture.detectChanges();

      component.submit();

      const anthropicWarning = fixture.nativeElement.querySelector('#anthropicApiKeyRequired');
      const openAiWarning = fixture.nativeElement.querySelector('#openAiApiKeyRequired');
      expect(anthropicWarning.style.display).toBe('block');
      expect(openAiWarning.style.display).toBe('none');
    });

    it('should hide warning and save if Claude LLM is selected and Anthropic key is present', () => {
      component.selectedLlm = 'claude-3-5-haiku-20241022';
      component.anthropicApiKey = 'valid-anthropic-key';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#anthropicApiKeyRequired');
      expect(warningElement.style.display).toBe('none');
      expect(mockBasicRestService.post).toHaveBeenCalled();
    });
  });

  describe('Voyage API Key Validation', () => {
    it('should display warning if voyage-2 embedding is selected and Voyage key is missing', () => {
      component.selectedEmbeddingModel = 'voyage-2';
      component.voyageApiKey = '';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#voyageApiKeyRequired');
      expect(warningElement.style.display).toBe('block');
      expect(mockBasicRestService.post).not.toHaveBeenCalled();
    });

    it('should hide warning and save if voyage-2 embedding is selected and Voyage key is present', () => {
      component.selectedEmbeddingModel = 'voyage-2';
      component.voyageApiKey = 'valid-voyage-key';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#voyageApiKeyRequired');
      expect(warningElement.style.display).toBe('none');
      expect(mockBasicRestService.post).toHaveBeenCalled();
    });

    it('should not require Voyage key for voyage-3 embedding model', () => {
      component.selectedEmbeddingModel = 'voyage-3';
      component.voyageApiKey = '';
      fixture.detectChanges();

      component.submit();

      const warningElement = fixture.nativeElement.querySelector('#voyageApiKeyRequired');
      expect(warningElement.style.display).toBe('none');
      expect(mockBasicRestService.post).toHaveBeenCalled();
    });
  });

  describe('Config Loading', () => {
    it('should load user config when dialog opens', () => {
      expect(mockBasicRestService.get).toHaveBeenCalled();
      expect(component.selectedEmbeddingModel).toBe('text-embedding-ada-002');
      expect(component.selectedLlm).toBe('gpt-4-turbo');
      expect(component.openAiApiKey).toBe('test-openai-key');
    });

    it('should handle 404 error gracefully when no config exists', async () => {
      const consoleErrorSpy = spyOn(console, 'error');
      mockBasicRestService.get.and.returnValue(throwError({ status: 404 }));

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        declarations: [ConfigDialogComponent],
        imports: [FormsModule],
        providers: [
          { provide: BasicRestService, useValue: mockBasicRestService },
          { provide: ConfigDialogService, useValue: mockConfigDialogService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ConfigDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(consoleErrorSpy).toHaveBeenCalledWith('User config not found (404)');
    });

    it('should handle generic errors gracefully', async () => {
      const consoleErrorSpy = spyOn(console, 'error');
      const genericError = { status: 500, message: 'Server error' };
      mockBasicRestService.get.and.returnValue(throwError(genericError));

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        declarations: [ConfigDialogComponent],
        imports: [FormsModule],
        providers: [
          { provide: BasicRestService, useValue: mockBasicRestService },
          { provide: ConfigDialogService, useValue: mockConfigDialogService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ConfigDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(consoleErrorSpy).toHaveBeenCalledWith('An error occurred', genericError);
    });

    it('should use default values when config fields are missing', async () => {
      mockBasicRestService.get.and.returnValue(of({}));

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        declarations: [ConfigDialogComponent],
        imports: [FormsModule],
        providers: [
          { provide: BasicRestService, useValue: mockBasicRestService },
          { provide: ConfigDialogService, useValue: mockConfigDialogService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ConfigDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.selectedEmbeddingModel).toBe('text-embedding-ada-002');
      expect(component.selectedLlm).toBe('gpt-4-turbo');
      expect(component.openAiApiKey).toBe('');
      expect(component.anthropicApiKey).toBe('');
    });
  });

  describe('Config Saving', () => {
    it('should save config to backend with correct payload', () => {
      localStorage.setItem('currentUserId', 'test-user-123');
      component.selectedEmbeddingModel = 'text-embedding-3-small';
      component.selectedLlm = 'gpt-4o';
      component.selectedSpeechToTextModel = 'Whisper';
      component.openAiApiKey = 'my-openai-key';
      component.anthropicApiKey = 'my-anthropic-key';
      component.voyageApiKey = 'my-voyage-key';
      component.togetherApiKey = 'my-together-key';
      component.currentEmbeddingModel = 'text-embedding-3-small';
      fixture.detectChanges();

      component.submit();

      expect(mockBasicRestService.post).toHaveBeenCalledWith('userConfig', {
        id: 'test-user-123',
        embeddingModel: 'text-embedding-3-small',
        llm: 'gpt-4o',
        speechToTextModel: 'Whisper',
        openAiApiKey: 'my-openai-key',
        anthropicApiKey: 'my-anthropic-key',
        voyageApiKey: 'my-voyage-key',
        togetherApiKey: 'my-together-key',
        recreateIndex: false,
      });
    });

    it('should save config to localStorage after successful save', () => {
      component.selectedEmbeddingModel = 'text-embedding-ada-002';
      component.selectedLlm = 'gpt-4-turbo';
      component.selectedSpeechToTextModel = 'none';
      component.openAiApiKey = 'openai-key';
      component.anthropicApiKey = 'anthropic-key';
      component.voyageApiKey = 'voyage-key';
      component.togetherApiKey = 'together-key';
      component.currentEmbeddingModel = 'text-embedding-ada-002';
      fixture.detectChanges();

      component.submit();

      const savedConfig = JSON.parse(localStorage.getItem('config') || '{}');
      expect(savedConfig.embeddingModel).toBe('text-embedding-ada-002');
      expect(savedConfig.llm).toBe('gpt-4-turbo');
      expect(savedConfig.speechToTextModel).toBe('none');
      expect(savedConfig.openAiApiKey).toBe('openai-key');
    });

    it('should include recreateIndex flag when embedding model changes', () => {
      localStorage.setItem('currentUserId', 'test-user');
      component.currentEmbeddingModel = 'text-embedding-ada-002';
      component.selectedEmbeddingModel = 'text-embedding-3-small';
      component.selectedLlm = 'gpt-4-turbo';
      component.openAiApiKey = 'valid-key';
      fixture.detectChanges();

      component.submit();

      expect(mockBasicRestService.post).toHaveBeenCalledWith(
        'userConfig',
        jasmine.objectContaining({
          recreateIndex: true,
        })
      );
    });
  });

  describe('Dialog Interaction', () => {
    it('should close dialog when closeDialog() is called', () => {
      component.closeDialog();

      expect(mockConfigDialogService.closeDialog).toHaveBeenCalled();
    });

    it('should call configDialogService.closeDialog on successful submit', () => {
      component.selectedLlm = 'gpt-4-turbo';
      component.openAiApiKey = 'valid-key';
      component.currentEmbeddingModel = 'text-embedding-ada-002';
      component.selectedEmbeddingModel = 'text-embedding-ada-002';
      fixture.detectChanges();

      component.submit();

      expect(mockConfigDialogService.closeDialog).toHaveBeenCalled();
    });

    it('should not close dialog when validation fails', () => {
      mockConfigDialogService.closeDialog.calls.reset();
      component.selectedLlm = 'gpt-4-turbo';
      component.openAiApiKey = '';
      fixture.detectChanges();

      component.submit();

      expect(mockConfigDialogService.closeDialog).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should subscribe to dialog state on init', () => {
      expect(component.isOpen).toBe(true);
    });

    it('should unsubscribe on destroy', () => {
      const unsubscribeSpy = spyOn(component.subscription, 'unsubscribe');

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});
