import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

  it('should display Together AI API key warning if Together AI LLM is selected and key is missing', () => {
    component.selectedLlm = 'together-meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8';
    component.togetherApiKey = '';
    fixture.detectChanges();

    component.submit();

    const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
    expect(warningElement.style.display).toBe('block');
    expect(mockBasicRestService.post).not.toHaveBeenCalled();
  });

  it('should display Together AI API key warning if Together AI embedding model is selected and key is missing', () => {
    component.selectedEmbeddingModel = 'together-m2-bert-80M';
    component.togetherApiKey = '';
    fixture.detectChanges();

    component.submit();

    const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
    expect(warningElement.style.display).toBe('block');
    expect(mockBasicRestService.post).not.toHaveBeenCalled();
  });

  it('should hide Together AI API key warning if Together AI LLM is selected and key is present', () => {
    component.selectedLlm = 'together-meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8';
    component.togetherApiKey = 'valid-together-key';
    fixture.detectChanges();

    component.submit();

    const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
    expect(warningElement.style.display).toBe('none');
    expect(mockBasicRestService.post).toHaveBeenCalled();
  });

  it('should hide Together AI API key warning if Together AI embedding model is selected and key is present', () => {
    component.selectedEmbeddingModel = 'together-m2-bert-80M';
    component.togetherApiKey = 'valid-together-key';
    fixture.detectChanges();

    component.submit();

    const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
    expect(warningElement.style.display).toBe('none');
    expect(mockBasicRestService.post).toHaveBeenCalled();
  });

  it('should not display Together AI API key warning if non-Together AI models are selected', () => {
    component.selectedLlm = 'gpt-4-turbo';
    component.selectedEmbeddingModel = 'text-embedding-ada-002';
    component.togetherApiKey = ''; // Key is missing but not for Together AI models
    fixture.detectChanges();

    component.submit();

    const warningElement = fixture.nativeElement.querySelector('#togetherApiKeyRequired');
    expect(warningElement.style.display).toBe('none');
    expect(mockBasicRestService.post).toHaveBeenCalled();
  });
});
