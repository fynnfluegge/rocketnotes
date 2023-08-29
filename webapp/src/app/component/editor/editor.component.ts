import {
  Component,
  Input,
  VERSION,
} from '@angular/core';
import { Auth } from 'aws-amplify';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import jwt_decode from 'jwt-decode';
import { ActivatedRoute } from '@angular/router';
import { DocumentTree } from '../navigation/sidenav.component';
import { Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { HostListener } from '@angular/core';

import OpenAI from 'openai';

import '../../../assets/prism-custom.js';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent {
  @Input() showSidebar: Boolean;

  public showPreview: Boolean = true;
  public showSnackbar: Boolean = false;
  public editorMode: Boolean = false;
  public fullscreen: Boolean = false;

  suggestion = '';

  angularVersion = VERSION.full;
  ngxMarkdownVersion = '12.0.1';

  private id: string;
  public title: string;
  public content: string;
  public isPublic: boolean;
  public publicLink: string;

  initialContent: string;

  keyPressCounter: number = 0;

  private openai: OpenAI;
  private abortController: AbortController;
  private completionTimeout: NodeJS.Timeout | undefined;
  private suggestionLinebreak: boolean = false;


  constructor(
    private database: DocumentTree,
    private basicRestService: BasicRestService,
    private route: ActivatedRoute,
    private titleService: Title,
    private location: Location
  ) { }

  ngOnInit() {
    if (environment.production) {
      Auth.currentAuthenticatedUser().then((user) => {
        localStorage.setItem('currentUserId', user.username);
        localStorage.setItem('username', user.attributes.email);
      });
    } else {
      localStorage.setItem(
        'currentUserId',
        '4afe1f16-add0-11ed-afa1-0242ac120002'
      );
      localStorage.setItem('username', 'localuser@test.com');
    }

    this.database.initContentChange.subscribe((value) => {
      this.id = value.id;
      this.title = value.title;
      this.content = value.content;
      this.titleService.setTitle(value.title);
      this.isPublic = value.isPublic;
      this.publicLink = environment.redirectSignIn + '/shared/' + this.id;
      this.location.replaceState('/' + this.id);
    });

    this.route.paramMap.subscribe((params) => {
      this.id = params.get('id');
      if (this.id) {
        this.basicRestService
          .get('document/' + this.id)
          .subscribe((message) => {
            var document = JSON.parse(JSON.stringify(message));
            this.content = document.content;
            this.title = document.title;
            this.titleService.setTitle(document.title);
            this.isPublic = document.isPublic;
            this.publicLink = environment.redirectSignIn + '/shared/' + this.id;
          });
      }
    });

    this.openai = new OpenAI({
      apiKey: environment.openAiApiKey,
      dangerouslyAllowBrowser: true,
    });
    this.abortController = new AbortController();
  }

  togglePreviewPanel() {
    this.showPreview = !this.showPreview;
    this.suggestion = '';
    setTimeout(() => {
      // add synchronize scroll event listener
      if (this.showPreview) {
        const previewPanel = document.getElementById('markdownPreview');
        const markdownTextarea = document.getElementById('markdownTextarea');
        this.addSynchronizedScrollEventListeners(
          markdownTextarea,
          previewPanel
        );
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
          const previewPanel = document.getElementById('markdownPreview');
          this.addSynchronizedScrollEventListeners(
            markdownTextarea,
            previewPanel
          );
        }
      }, 100);
      this.keyPressCounter = 0;
      this.initialContent = (' ' + this.content).slice(1);
    }
  }

  addSynchronizedScrollEventListeners(markdownEditor: any, previewPanel: any) {
    markdownEditor.addEventListener('scroll', (event: any) =>
      this.synchronizeScroll(event)
    );
    previewPanel.addEventListener('scroll', (event: any) =>
      this.synchronizeScroll(event)
    );
  }

  synchronizeScroll(event: any) {
    // Synchronize only in editor preview mode
    if (this.showPreview) {
      var scrollTop = event.target.scrollTop;
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
        this.keyPressCounter = 0;
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
      const markdownTextarea = document.getElementById('markdownTextarea') as HTMLInputElement;
      var currentPos = markdownTextarea.selectionStart;
      var value = markdownTextarea.value;
      var newValue =
        value.substring(0, currentPos) + '\n' + value.substring(currentPos);
      markdownTextarea.value = newValue;
      markdownTextarea.selectionStart = currentPos + 1;
      markdownTextarea.selectionEnd = currentPos + 1;
      // if cursor is at the bottom of the textarea, scroll down
      if (markdownTextarea.scrollTop + markdownTextarea.clientHeight >= markdownTextarea.scrollHeight - 32) {
        // Scroll the markdownTextarea down by one line (adjust the value as needed)
        markdownTextarea.scrollTop += markdownTextarea.clientHeight;
      }
    }
    else if (event.code !== 'Escape') {
      this.keyPressCounter++;
      if (this.keyPressCounter === 20) {
        this.keyPressCounter = 0;
        this.submit();
      }

      this.abortController.abort();
      this.abortController = new AbortController();
      const markdownTextarea = document.getElementById('markdownTextarea') as HTMLInputElement;
      const start = markdownTextarea.selectionStart
      const end = markdownTextarea.selectionEnd;
      const textAfterCursor = this.content.substring(start);

      // Accept completion suggestion
      if (event.code === 'Tab' && this.suggestion !== '') {
        event.preventDefault();
        const textBeforeCursor = this.content.substring(0, start);

        // Insert the suggestion
        const adjustedText = textBeforeCursor + this.suggestion + textAfterCursor
        markdownTextarea.value = adjustedText;

        // Restore the cursor position
        markdownTextarea.selectionStart = start + this.suggestion.length;
        markdownTextarea.selectionEnd = end + this.suggestion.length;
        this.suggestion = '';
        if (this.suggestionLinebreak) {
          this.suggestionLinebreak = false;
        }
      }
      else if (event.code === 'Tab') {
        event.preventDefault();
      }
      // Create new completion suggestion
      else if (event.code !== 'ArrowDown' && event.code !== 'ArrowUp' && event.code !== 'ArrowLeft' && event.code !== 'ArrowRight' && event.code !== 'Backspace') {
        this.suggestion = '';
        if (this.suggestionLinebreak) {
          this.suggestionLinebreak = false;
          markdownTextarea.value = this.content.substring(0, start) + this.content.substring(start);
          markdownTextarea.selectionStart = start;
          markdownTextarea.selectionEnd = end;
        }
        if (textAfterCursor === '' || textAfterCursor.startsWith('\n')) {
          const textBeforeCursor = this.content.substring(0, start) + (event.key.length === 1 ? event.key : '');
          var lastParagraph = this.extractLastParagraph(textBeforeCursor);
          if (lastParagraph.length < 32 || lastParagraph.length > 256) {
            lastParagraph = this.extractLast20Words(textBeforeCursor);
          }

          if (this.completionTimeout !== undefined) {
            clearTimeout(this.completionTimeout);
          }

          this.completionTimeout = setTimeout(() => {
            this.aiCompletion(this.abortController.signal, lastParagraph).then((completion) => {
              if (completion === undefined) {
                return;
              }
              let caretCoordinates = this.getCaretCoordinates(markdownTextarea, start);
              this.suggestion = "This is a suggestion"
              let suggestionFitsInLine = this.suggestionFitsInLine(this.suggestion, caretCoordinates.relativeLeft, markdownTextarea.clientWidth);
              if (!suggestionFitsInLine) {
                caretCoordinates = this.getCaretCoordinatesForNextLine(markdownTextarea.getBoundingClientRect().left, caretCoordinates.top, caretCoordinates.height);
                console.log(this.suggestionLinebreak);
                if (!this.suggestionLinebreak && !textAfterCursor.startsWith('\n\n')) {
                  console.log('insert linebreak')
                  const cursorPosition = markdownTextarea.selectionStart;
                  const textBeforeCursor = this.content.substring(0, cursorPosition);
                  const textAfterCursor = this.content.substring(cursorPosition);
                  console.log(textBeforeCursor);
                  console.log(textAfterCursor);
                  this.suggestionLinebreak = true;
                  const currentStart = markdownTextarea.selectionStart;
                  markdownTextarea.value = textBeforeCursor + ' \n' + textAfterCursor;
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
        if (this.suggestionLinebreak) {
          this.suggestionLinebreak = false;
          markdownTextarea.value = this.content.substring(0, start) + this.content.substring(start);
          markdownTextarea.selectionStart = start;
          markdownTextarea.selectionEnd = end;
        }
      }
    }
  }

  async aiCompletion(abortSignal: AbortSignal, text: string) {
    const completion = await this.openai.chat.completions.create({
      messages: [{
        role: 'user', content: 'Complete the following text with 1 to 5 words: ' + text
      }],
      model: 'gpt-3.5-turbo',
      temperature: 0.9,
      // stop: ["\n", "."]
    });

    // Check if the signal is aborted
    if (abortSignal.aborted) {
      return;
    }

    if (completion.choices[0].message.content === '0') {
      return;
    }

    if (completion.choices[0].message.content.toLowerCase().includes("sorry")) {
      return;
    }

    return completion.choices[0].message.content;
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
    const paragraphs: string[] = inputString.split("\n");

    // Get the last paragraph from the array
    const lastParagraph: string = paragraphs[paragraphs.length - 1];

    return lastParagraph;
  }

  updateSuggestionPosition(cursorPosition) {
    const suggestionElement = document.querySelector('.suggestion') as HTMLElement;
    if (suggestionElement) {
      suggestionElement.style.top = cursorPosition.top + 'px';
      suggestionElement.style.left = cursorPosition.left + 'px';
    }
  }

  submit(): void {
    this.basicRestService
      .post('saveDocument', {
        id: this.id,
        userId: localStorage.getItem('currentUserId'),
        title: this.title,
        content: this.content,
        isPublic: this.isPublic,
      })
      .subscribe(() => {
        this.showSnackbar = true;
        setTimeout(() => {
          this.showSnackbar = false;
        }, 1000);
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
    setTimeout(function() {
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
    'direction',  // RTL support
    'boxSizing',
    'width',  // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
    'height',
    'overflowX',
    'overflowY',  // copy the scrollbar for IE

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
    'textDecoration',  // might not make a difference, but better be safe

    'letterSpacing',
    'wordSpacing',

    'tabSize',
    'MozTabSize'

  ];
  isBrowser = (typeof window !== 'undefined');
  // isFirefox = (isBrowser && window.mozInnerScreenX != null);
  getCaretCoordinates(element, position) {

    // The mirror div will replicate the textarea's style
    var div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    document.body.appendChild(div);

    var style = div.style;
    var computed = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;  // currentStyle for IE < 9
    var isInput = element.nodeName === 'INPUT';

    // Default textarea styles
    style.whiteSpace = 'pre-wrap';
    if (!isInput)
      style.wordWrap = 'break-word';  // only for textarea-s

    // Position off-screen
    style.position = 'absolute';  // required to return coordinates properly
    // if (!debug)
    //   style.visibility = 'hidden';  // not 'display: none' because we want rendering

    // Transfer the element's properties to the div
    this.properties.forEach(function(prop) {
      if (isInput && prop === 'lineHeight') {
        // Special case for <input>s because text is rendered centered and line height may be != height
        if (computed.boxSizing === "border-box") {
          var height = parseInt(computed.height);
          var outerHeight =
            parseInt(computed.paddingTop) +
            parseInt(computed.paddingBottom) +
            parseInt(computed.borderTopWidth) +
            parseInt(computed.borderBottomWidth);
          var targetHeight = outerHeight + parseInt(computed.lineHeight);
          if (height > targetHeight) {
            style.lineHeight = height - outerHeight + "px";
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

    style.overflow = 'hidden';  // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'

    div.textContent = element.value.substring(0, position);
    // The second special handling for input type="text" vs textarea:
    // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
    if (isInput)
      div.textContent = div.textContent.replace(/\s/g, '\u00a0');

    var span = document.createElement('span');
    // Wrapping must be replicated *exactly*, including when a long word gets
    // onto the next line, with whitespace at the end of the line before (#7).
    // The  *only* reliable way to do that is to copy the *entire* rest of the
    // textarea's content into the <span> created at the caret position.
    // For inputs, just '.' would be enough, but no need to bother.
    span.textContent = element.value.substring(position) || '.';  // || because a completely empty faux span doesn't render at all
    div.appendChild(span);


    var coordinates = {
      top: span.offsetTop + parseInt(computed['borderTopWidth']) - element.scrollTop + element.getBoundingClientRect().top - 8,
      left: span.offsetLeft + parseInt(computed['borderLeftWidth']) + element.getBoundingClientRect().left + 4,
      relativeLeft: span.offsetLeft + parseInt(computed['borderLeftWidth']),
      height: parseInt(computed['lineHeight'])
    };
    document.body.removeChild(div);

    return coordinates;
  }

  suggestionFitsInLine(suggestion: string, position: number, width: number) {
    const suggestionLength = suggestion.length * 8;
    const spaceLeftAfterSuggestion = width - position - suggestionLength;
    if (spaceLeftAfterSuggestion > 0) {
      return true;
    }
    return false;
  }

  getCaretCoordinatesForNextLine(textAreaLeft: number, positionTop: number, lineHeight: number) {
    return {
      top: positionTop + lineHeight - 2,
      left: textAreaLeft + 8,
      relativeLeft: 8,
      height: lineHeight
    };
  }
}
