import { Component, Input, VERSION } from '@angular/core';
import { Auth } from 'aws-amplify';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { ConfigDialogService } from 'src/app/service/config-dialog-service';
import { DocumentTree } from 'src/app/service/document-tree-service';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, retry } from 'rxjs';
import OpenAI from 'openai';
import '../../../assets/prism-custom.js';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  providers: [ConfigDialogService],
})
export class EditorComponent {
  @Input() showSidebar: boolean;

  public showPreview: boolean = true;
  public showSnackbar: boolean = false;
  public editorMode: boolean = false;
  public fullscreen: boolean = false;
  public isMobileDevice = false;

  suggestion = '';

  angularVersion = VERSION.full;
  ngxMarkdownVersion = '12.0.1';

  private id: string;
  public title: string;
  public content: string;
  public isPublic: boolean;
  public isDeleted: boolean;
  public publicLink: string;

  initialContent: string;

  private openai: OpenAI;
  private abortController: AbortController;
  private completionTimeout: NodeJS.Timeout | undefined;
  private suggestionLinebreak: boolean = false;

  // This is used when Enter is hit at the bottom of the textarea
  // Sync scroll is disabled for a short time to prevent the textarea from scrolling up
  private disableSynchronizeScroll: boolean = false;

  public aiCompletionEnabled: boolean = false;

  private timer: any;

  constructor(
    private documentTree: DocumentTree,
    private basicRestService: BasicRestService,
    private route: ActivatedRoute,
    private titleService: Title,
    private location: Location,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    if (environment.production) {
      Auth.currentAuthenticatedUser().then((user) => {
        localStorage.setItem('currentUserId', user.username);
        localStorage.setItem('username', user.attributes.email);
      });
    } else {
      localStorage.setItem(
        'currentUserId',
        '4afe1f16-add0-11ed-afa1-0242ac120002',
      );
      localStorage.setItem('username', 'localuser@test.com');
    }

    this.documentTree.initContentChange.subscribe((value) => {
      this.id = value.id;
      this.title = value.title;
      this.content = value.content;
      this.titleService.setTitle(value.title);
      this.isPublic = value.isPublic;
      this.isDeleted = value.deleted;
      this.publicLink = environment.redirectSignIn + '/shared/' + this.id;
      this.location.replaceState('/' + this.id);
    });

    this.route.paramMap.subscribe((params) => {
      this.id = params.get('id');
      if (this.id) {
        this.basicRestService
          .get('document/' + this.id)
          .subscribe((message) => {
            const document = JSON.parse(JSON.stringify(message));
            this.content = document.content;
            this.title = document.title;
            this.titleService.setTitle(document.title);
            this.isPublic = document.isPublic;
            this.isDeleted = document.deleted;
            this.publicLink = environment.redirectSignIn + '/shared/' + this.id;
          });
      }
    });

    this.basicRestService
      .get('userConfig/' + localStorage.getItem('currentUserId'))
      .subscribe(
        (config) => {
          localStorage.setItem('config', JSON.stringify(config));
          if (config['llm']) {
            if (config['llm'].startsWith('gpt')) {
              this.openai = new OpenAI({
                apiKey: config['openAiApiKey'],
                dangerouslyAllowBrowser: true,
              });
            } else if (config['llm'] === 'claude') {
              // use lambda proxy
            }
          }
        },
        (error) => {
          if (error.status === 404) {
            console.error('User config not found (404)');
          } else {
            console.error('An error occurred', error);
          }
        },
      );

    this.abortController = new AbortController();

    this.isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(
        navigator.userAgent,
      );

    this.aiCompletionEnabled =
      localStorage.getItem('aiCompletionEnabled') === 'true';
  }

  private startOrResetTimer(): void {
    // Clear the existing timer
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // Set a new timer
    this.timer = setTimeout(() => {
      // TODO only submit if content has changed
      // this.submit();
      this.timer = null; // Clear the timer after submit
    }, 10000);
  }

  toggleAiCompletion() {
    if (!this.aiCompletionEnabled && !localStorage.getItem('config')) {
      window.alert(
        'Please configure your LLM settings first. Click on the LLM config button in the user menu popup.',
      );
    } else {
      this.aiCompletionEnabled = !this.aiCompletionEnabled;
      localStorage.setItem(
        'aiCompletionEnabled',
        this.aiCompletionEnabled.toString(),
      );
    }
  }

  closeDialog(id: string) {
    const overlay = document.getElementById(id);
    overlay.style.display = 'none';
  }

  togglePreviewPanel() {
    this.showPreview = !this.showPreview;
    this.suggestion = '';
    setTimeout(() => {
      // add synchronize scroll event listener
      if (this.showPreview) {
        const previewPanel = document.getElementById('markdownPreview');
        const markdownTextarea = document.getElementById('markdownTextarea');
        this.addSynchronizedScrollEventListeners(markdownTextarea);
        previewPanel.scrollTop = markdownTextarea.scrollTop;
      }
    }, 100);
  }

  changeMode() {
    this.editorMode = !this.editorMode;
    this.suggestion = '';
    if (this.editorMode) {
      setTimeout(() => {
        // add synchronize scroll event listener
        if (this.showPreview) {
          const markdownTextarea = document.getElementById('markdownTextarea');
          this.addSynchronizedScrollEventListeners(markdownTextarea);
        }
      }, 100);
      this.initialContent = (' ' + this.content).slice(1);
    }
  }

  addSynchronizedScrollEventListeners(markdownEditor: any) {
    markdownEditor.addEventListener('scroll', (event: any) =>
      this.synchronizeScroll(event),
    );
  }

  synchronizeScroll(event: any) {
    // Synchronize only in editor preview mode
    if (this.showPreview && !this.disableSynchronizeScroll) {
      const scrollTop = event.target.scrollTop;
      const previewPanel = document.getElementById('markdownPreview');
      const markdownTextarea = document.getElementById('markdownTextarea');
      // Synchronize the scrollTop property of the other panel
      if (event.target === markdownTextarea) {
        previewPanel.scrollTop = scrollTop;
      } else if (event.target === previewPanel) {
        markdownTextarea.scrollTop = scrollTop;
      }
    }
  }

  cancelEdit() {
    if (this.editorMode) {
      this.editorMode = false;
      this.suggestion = '';
      this.submit();
    }
  }

  undoChanges() {
    if (confirm('Are you sure to undo all Changes to ' + this.title + '?')) {
      if (this.initialContent !== this.content) {
        this.content = this.initialContent;
        this.submit();
      }
    }
  }

  @HostListener('document:keydown.meta.e', ['$event'])
  toggleEditMode() {
    this.changeMode();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault(); // prevent usual browser behavour
      this.abortController.abort();
      this.abortController = new AbortController();
      this.suggestion = '';
      const markdownTextarea = document.getElementById(
        'markdownTextarea',
      ) as HTMLInputElement;
      const currentPos = markdownTextarea.selectionStart;
      const value = markdownTextarea.value;
      const newValue =
        value.substring(0, currentPos) + '\n' + value.substring(currentPos);
      markdownTextarea.value = newValue;
      markdownTextarea.selectionStart = currentPos + 1;
      markdownTextarea.selectionEnd = currentPos + 1;
    } else if (event.code !== 'Escape') {
      this.startOrResetTimer();

      if (this.aiCompletionEnabled) {
        this.abortController.abort();
        this.abortController = new AbortController();
        const markdownTextarea = document.getElementById(
          'markdownTextarea',
        ) as HTMLInputElement;
        const start = markdownTextarea.selectionStart;
        const end = markdownTextarea.selectionEnd;
        const textAfterCursor = this.content.substring(start);

        // Accept completion suggestion
        if (event.code === 'Tab' && this.suggestion !== '') {
          event.preventDefault();
          const textBeforeCursor = this.content.substring(0, start);

          // Insert the suggestion
          const adjustedText =
            textBeforeCursor + this.suggestion + textAfterCursor;
          markdownTextarea.value = adjustedText;

          // Restore the cursor position
          markdownTextarea.selectionStart = start + this.suggestion.length;
          markdownTextarea.selectionEnd = end + this.suggestion.length;
          this.suggestion = '';
          if (this.suggestionLinebreak) {
            this.suggestionLinebreak = false;
          }
        } else if (event.code === 'Tab') {
          event.preventDefault();
        }
        // Create new completion suggestion
        else if (
          event.code !== 'ArrowDown' &&
          event.code !== 'ArrowUp' &&
          event.code !== 'ArrowLeft' &&
          event.code !== 'ArrowRight' &&
          event.code !== 'Backspace'
        ) {
          this.suggestion = '';
          this.unbreakSuggestionSpace(start, end);
          if (textAfterCursor === '' || textAfterCursor.startsWith('\n')) {
            const textBeforeCursor =
              this.content.substring(0, start) +
              (event.key.length === 1 ? event.key : '');
            let lastParagraph = this.extractLastParagraph(textBeforeCursor);
            if (lastParagraph.length < 32 || lastParagraph.length > 256) {
              lastParagraph = this.extractLast20Words(textBeforeCursor);
            }

            if (this.completionTimeout !== undefined) {
              clearTimeout(this.completionTimeout);
            }

            this.completionTimeout = setTimeout(() => {
              this.aiCompletion(
                this.abortController.signal,
                lastParagraph,
              ).then((completion) => {
                if (completion === undefined) {
                  return;
                }
                let caretCoordinates = this.getCaretCoordinates(
                  markdownTextarea,
                  start,
                );
                this.suggestion = completion;
                const suggestionFitsInLine = this.suggestionFitsInLine(
                  this.suggestion,
                  caretCoordinates.relativeLeft,
                  markdownTextarea.clientWidth,
                );
                if (!suggestionFitsInLine) {
                  caretCoordinates = this.getCaretCoordinatesForNextLine(
                    markdownTextarea.getBoundingClientRect().left,
                    caretCoordinates.top,
                    caretCoordinates.height,
                  );
                  if (
                    !this.suggestionLinebreak &&
                    !textAfterCursor.startsWith('\n\n')
                  ) {
                    const cursorPosition = markdownTextarea.selectionStart;
                    const textBeforeCursor = this.content.substring(
                      0,
                      cursorPosition,
                    );
                    const textAfterCursor =
                      this.content.substring(cursorPosition);
                    this.suggestionLinebreak = true;
                    const currentStart = markdownTextarea.selectionStart;
                    markdownTextarea.value =
                      textBeforeCursor + ' \n' + textAfterCursor;
                    markdownTextarea.selectionStart = currentStart;
                    markdownTextarea.selectionEnd = currentStart;
                  }
                } else {
                  this.suggestionLinebreak = false;
                  // if a space is in front of the cursor position, move the suggestion 4px to the left, since
                  // the caretCoordinates are shifted right in that case
                  if (textBeforeCursor.endsWith(' ')) {
                    caretCoordinates.left -= 4;
                  }
                }
                this.updateSuggestionPosition(caretCoordinates);
              });
            }, 500);
          }
        } else {
          this.suggestion = '';
          this.unbreakSuggestionSpace(start, end);
        }
      }
    }
  }

  unbreakSuggestionSpace(start: number, end: number) {
    if (this.suggestionLinebreak) {
      this.suggestionLinebreak = false;
      const markdownTextarea = document.getElementById(
        'markdownTextarea',
      ) as HTMLInputElement;
      markdownTextarea.value =
        this.content.substring(0, start) + this.content.substring(start);
      markdownTextarea.selectionStart = start;
      markdownTextarea.selectionEnd = end;
    }
  }

  async aiCompletion(abortSignal: AbortSignal, text: string) {
    // Check if the signal is aborted or openau api key is not set
    if (abortSignal.aborted || this.openai === undefined) {
      return;
    }
    const config = JSON.parse(localStorage.getItem('config'));
    const prompt = 'Complete the following text with 1 to 5 words: ' + text;
    let message = '';
    if (config['llm'].startsWith('gpt')) {
      const completion = await this.openai.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: config['llm'],
        temperature: 0.9,
      });
      message = completion.choices[0].message.content;
    } else if (config['llm'].startsWith('claude')) {
      this.basicRestService
        .post('text-completion', {
          prompt: prompt,
          api_key: config['anthropicApiKey'],
          model: config['llm'],
        })
        .subscribe((response) => {
          message = JSON.stringify(response);
        });
    } else if (config['llm'].startsWith('Ollama')) {
      await lastValueFrom(
        this.http
          .post('http://localhost:11434/api/generate', {
            prompt: prompt,
            model: config['llm'].split('Ollama-')[1],
            stream: false,
          })
          .pipe(retry(1)),
      ).then((response) => {
        message = response['response'];
      });
    }

    if (message === '0') {
      return;
    }

    if (message.toLowerCase().includes('sorry')) {
      return;
    }

    return message;
  }

  extractLast20Words(inputString: string): string {
    // Split the input string into words using whitespace as the delimiter
    const words = inputString.split(/\s+/);

    // If there are 20 or more words, slice the last 20 words and join them back into a string
    if (words.length >= 10) {
      const last20Words = words.slice(-10).join(' ');
      return last20Words;
    }

    // If there are fewer than 20 words, return the whole input string
    return inputString;
  }

  extractLastParagraph(inputString: string): string {
    const paragraphs: string[] = inputString.split('\n');

    // Get the last paragraph from the array
    const lastParagraph: string = paragraphs[paragraphs.length - 1];

    return lastParagraph;
  }

  updateSuggestionPosition(cursorPosition) {
    const suggestionElement = document.querySelector(
      '.suggestion',
    ) as HTMLElement;
    if (suggestionElement) {
      suggestionElement.style.top = cursorPosition.top + 'px';
      suggestionElement.style.left = cursorPosition.left + 'px';
    }
  }

  submit(): void {
    const lastModified = this.documentTree.updateLastModifiedDate(this.id);

    this.basicRestService
      .post('saveDocument', {
        document: {
          id: this.id,
          userId: localStorage.getItem('currentUserId'),
          title: this.title,
          content: this.content,
          deleted: this.isDeleted,
          lastModified: lastModified,
          isPublic: this.isPublic,
        },
        documentTree: this.documentTree.getDocumentTree(),
      })
      .subscribe(() => {
        if (this.timer) {
          clearTimeout(this.timer);
        }
        // Snackbar disabled, since too many snackbar messages are displayed
        // this.showSnackbar = true;
        // setTimeout(() => {
        //   this.showSnackbar = false;
        // }, 1000);

        // Explicitly update the vector embeddings after the document has been saved only in local mode.
        // In deployed production mode, the vector embeddings are updated via sqs event after the document has been saved
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
                    documentId: this.id,
                    recreateIndex: false,
                  },
                },
              ],
            })
            .subscribe(() => {});
        }
      });
  }

  shareDocument(): void {
    document
      .getElementById('share-button')
      .children[0].classList.toggle('fa-share');
    document
      .getElementById('share-button')
      .children[0].classList.toggle('fa-hourglass');
    this.basicRestService
      .post('shareDocument', {
        id: this.id,
        isPublic: true,
      })
      .subscribe(() => {
        this.isPublic = true;
        document
          .getElementById('share-button')
          .children[0].classList.toggle('fa-share');
        document
          .getElementById('share-button')
          .children[0].classList.toggle('fa-hourglass');
      });
  }

  unshareDocument(): void {
    document
      .getElementById('unshare-button')
      .children[0].classList.toggle('fa-ban');
    document
      .getElementById('unshare-button')
      .children[0].classList.toggle('fa-hourglass');
    this.basicRestService
      .post('shareDocument', {
        id: this.id,
        isPublic: false,
      })
      .subscribe(() => {
        this.isPublic = false;
        document
          .getElementById('unshare-button')
          .children[0].classList.toggle('fa-ban');
        document
          .getElementById('unshare-button')
          .children[0].classList.toggle('fa-hourglass');
      });
  }

  copyLinkToClipBoard(event, textToCopy): void {
    const selBox = document.createElement('textarea');
    selBox.value = textToCopy;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    if (event.target.children.length === 0) {
      event.target.classList.toggle('fa-link');
      event.target.classList.toggle('fa-check');
    } else {
      event.target.children[0].classList.toggle('fa-link');
      event.target.children[0].classList.toggle('fa-check');
    }
    document.execCommand('copy');
    document.body.removeChild(selBox);
    setTimeout(function () {
      if (event.target.children.length === 0) {
        event.target.classList.toggle('fa-link');
        event.target.classList.toggle('fa-check');
      } else {
        event.target.children[0].classList.toggle('fa-link');
        event.target.children[0].classList.toggle('fa-check');
      }
    }, 1000);
  }

  properties = [
    'direction', // RTL support
    'boxSizing',
    'width', // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
    'height',
    'overflowX',
    'overflowY', // copy the scrollbar for IE

    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',

    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',

    // https://developer.mozilla.org/en-US/docs/Web/CSS/font
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',

    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration', // might not make a difference, but better be safe

    'letterSpacing',
    'wordSpacing',

    'tabSize',
    'MozTabSize',
  ];
  isBrowser = typeof window !== 'undefined';
  // isFirefox = (isBrowser && window.mozInnerScreenX != null);
  getCaretCoordinates(element, position) {
    // The mirror div will replicate the textarea's style
    const div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    document.body.appendChild(div);

    const style = div.style;
    const computed = window.getComputedStyle
      ? getComputedStyle(element)
      : element.currentStyle; // currentStyle for IE < 9
    const isInput = element.nodeName === 'INPUT';

    // Default textarea styles
    style.whiteSpace = 'pre-wrap';
    if (!isInput) style.wordWrap = 'break-word'; // only for textarea-s

    // Position off-screen
    style.position = 'absolute'; // required to return coordinates properly
    // if (!debug)
    //   style.visibility = 'hidden';  // not 'display: none' because we want rendering

    // Transfer the element's properties to the div
    this.properties.forEach(function (prop) {
      if (isInput && prop === 'lineHeight') {
        // Special case for <input>s because text is rendered centered and line height may be != height
        if (computed.boxSizing === 'border-box') {
          const height = parseInt(computed.height);
          const outerHeight =
            parseInt(computed.paddingTop) +
            parseInt(computed.paddingBottom) +
            parseInt(computed.borderTopWidth) +
            parseInt(computed.borderBottomWidth);
          const targetHeight = outerHeight + parseInt(computed.lineHeight);
          if (height > targetHeight) {
            style.lineHeight = height - outerHeight + 'px';
          } else if (height === targetHeight) {
            style.lineHeight = computed.lineHeight;
          } else {
            style.lineHeight = '0';
          }
        } else {
          style.lineHeight = computed.height;
        }
      } else {
        style[prop] = computed[prop];
      }
    });

    style.overflow = 'hidden'; // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'

    div.textContent = element.value.substring(0, position);
    // The second special handling for input type="text" vs textarea:
    // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
    if (isInput) div.textContent = div.textContent.replace(/\s/g, '\u00a0');

    const span = document.createElement('span');
    // Wrapping must be replicated *exactly*, including when a long word gets
    // onto the next line, with whitespace at the end of the line before (#7).
    // The  *only* reliable way to do that is to copy the *entire* rest of the
    // textarea's content into the <span> created at the caret position.
    // For inputs, just '.' would be enough, but no need to bother.
    span.textContent = element.value.substring(position) || '.'; // || because a completely empty faux span doesn't render at all
    div.appendChild(span);

    const coordinates = {
      top:
        span.offsetTop +
        parseInt(computed['borderTopWidth']) -
        element.scrollTop +
        element.getBoundingClientRect().top -
        8,
      left:
        span.offsetLeft +
        parseInt(computed['borderLeftWidth']) +
        element.getBoundingClientRect().left +
        4,
      relativeLeft: span.offsetLeft + parseInt(computed['borderLeftWidth']),
      height: parseInt(computed['lineHeight']),
    };
    document.body.removeChild(div);

    return coordinates;
  }

  suggestionFitsInLine(suggestion: string, position: number, width: number) {
    const suggestionLength = suggestion.length * 6;
    const spaceLeftAfterSuggestion = width - position - suggestionLength;
    if (spaceLeftAfterSuggestion > 0) {
      return true;
    }
    return false;
  }

  getCaretCoordinatesForNextLine(
    textAreaLeft: number,
    positionTop: number,
    lineHeight: number,
  ) {
    return {
      top: positionTop + lineHeight - 2,
      left: textAreaLeft + 8,
      relativeLeft: 8,
      height: lineHeight,
    };
  }
}
