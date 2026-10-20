import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { LlmDialogComponent } from './llm-dialog.component';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DocumentTree } from 'src/app/service/document-tree-service';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

describe('LlmDialogComponent', () => {
  let component: LlmDialogComponent;
  let fixture: ComponentFixture<LlmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LlmDialogComponent],
      imports: [HttpClientModule, FormsModule],
      providers: [
        BasicRestService,
        DocumentTree,
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '123' }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LlmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('LlmDialogComponent chat context', () => {
  let component: LlmDialogComponent;
  let rest: jasmine.SpyObj<any>;

  beforeEach(() => {
    rest = jasmine.createSpyObj('BasicRestService', ['post']);
    rest.post.and.returnValue(of('An answer with "quotes" and\nnewlines'));
    component = new LlmDialogComponent(null, null, rest, null);
    component.chatInput = 'A question';
  });

  it('starts with private notes and preserves answer text', fakeAsync(() => {
    component.sendChatMessage();
    expect(rest.post.calls.mostRecent().args[1].searchContext).toBe('notes');
    expect(component.messages[1].text).toBe('An answer with "quotes" and\nnewlines');
    tick();
  }));

  it('sends web context with one opaque ID across follow-up requests', fakeAsync(() => {
    component.searchContext = 'web';
    component.sendChatMessage();
    const first = rest.post.calls.mostRecent().args[1];
    component.chatInput = 'Read https://example.org';
    component.sendChatMessage();
    const next = rest.post.calls.mostRecent().args[1];
    expect(first.searchContext).toBe('web');
    expect(next.conversationId).toBe(first.conversationId);
    expect(first.conversationId).toMatch(/^[a-f0-9-]{36}$/);
    tick();
  }));

  it('new chat changes identity and clears the visible conversation', fakeAsync(() => {
    component.sendChatMessage();
    const first = component.conversationId;
    component.newChat();
    expect(component.conversationId).not.toBe(first);
    expect(component.messages).toEqual([]);
    tick();
  }));

  it('independent dialogs have independent identities', () => {
    const other = new LlmDialogComponent(null, null, rest, null);
    expect(other.conversationId).not.toBe(component.conversationId);
  });

  it('creates and resets opaque UUIDs without the secure-context randomUUID API', () => {
    const descriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const other = new LlmDialogComponent(null, null, rest, null);
      const first = other.conversationId;
      expect(first).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      other.newChat();
      expect(other.conversationId).not.toBe(first);
      expect(other.conversationId).toMatch(/^[a-f0-9-]{36}$/);
    } finally {
      if (descriptor) {
        Object.defineProperty(crypto, 'randomUUID', descriptor);
      } else {
        delete crypto['randomUUID'];
      }
    }
  });

  it('does not reset or duplicate an in-flight request', fakeAsync(() => {
    rest.post.and.returnValue(new Subject());
    component.sendChatMessage();
    const id = component.conversationId;
    component.newChat();
    component.chatInput = 'Duplicate';
    component.sendChatMessage();
    expect(component.conversationId).toBe(id);
    expect(rest.post).toHaveBeenCalledTimes(1);
    tick();
  }));

  it('recovers the input after an unavailable web search', fakeAsync(() => {
    rest.post.and.returnValue(throwError(() => new Error('Unavailable')));
    component.searchContext = 'web';
    const id = component.conversationId;
    component.sendChatMessage();
    expect(component.isLoading).toBeFalse();
    expect(component.messages[1].text).toContain('Please try again');
    expect(component.conversationId).toBe(id);
    tick();
  }));

  it('unsubscribes from an in-flight request on destruction', fakeAsync(() => {
    const response = new Subject();
    rest.post.and.returnValue(response);
    component.subscription = new Subject().subscribe();
    component.sendChatMessage();
    component.ngOnDestroy();
    response.next('Late answer');
    expect(component.messages.length).toBe(1);
    tick();
  }));

  it('explains when web access is disabled', fakeAsync(() => {
    rest.post.and.returnValue(throwError(() => ({ status: 403 })));
    component.searchContext = 'web';
    component.sendChatMessage();
    expect(component.messages[1].text).toContain('disabled by the server administrator');
    expect(component.isLoading).toBeFalse();
    tick();
  }));

  it('does not label denied note access as disabled web search', fakeAsync(() => {
    rest.post.and.returnValue(throwError(() => ({ status: 403 })));
    component.sendChatMessage();
    expect(component.messages[1].text).toBe('Could not answer this question. Please try again.');
    tick();
  }));
});
