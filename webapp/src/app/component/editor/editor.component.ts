import {
  Component,
  Input,
  ViewChild,
  ElementRef,
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

  angularVersion = VERSION.full;
  ngxMarkdownVersion = '12.0.1';

  private id: string;
  public title: string;
  public content: string;
  public isPublic: boolean;
  public publicLink: string;

  initialContent: string;

  keyPressCounter: number = 0;

  @ViewChild('markdownTextarea') markdownTextarea: ElementRef;

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

    this.startTimer();
  }

  togglePreviewPanel() {
    this.showPreview = !this.showPreview;
    setTimeout(() => {
      // add synchronize scroll event listener
      if (this.showPreview) {
        let previewPanel = document.getElementById('markdownPreview');
        this.addSynchronizedScrollEventListeners(
          this.markdownTextarea.nativeElement,
          previewPanel
        );
        previewPanel.scrollTop = this.markdownTextarea.nativeElement.scrollTop;
      }
    }, 100);
  }

  changeMode() {
    this.editorMode = !this.editorMode;
    if (this.editorMode) {
      setTimeout(() => {
        // add event listener to visible textarea for handling enter key to prevent scroll issue
        this.markdownTextarea.nativeElement.addEventListener(
          'keydown',
          (event: KeyboardEvent) => {
            this.handleTextareaKeyDown(
              event,
              this.markdownTextarea.nativeElement
            );
          }
        );

        // add synchronize scroll event listener
        if (this.showPreview) {
          let previewPanel = document.getElementById('markdownPreview');
          this.addSynchronizedScrollEventListeners(
            this.markdownTextarea.nativeElement,
            previewPanel
          );
        }
      }, 100);
      this.keyPressCounter = 0;
      this.initialContent = (' ' + this.content).slice(1);
    }
  }

  handleTextareaKeyDown(event: KeyboardEvent, elem: any) {
    if (event.key === 'Enter') {
      event.preventDefault(); // prevent usual browser behavour
      var currentPos = elem.selectionStart;
      var value = elem.value;
      var newValue =
        value.substr(0, currentPos) + '\n' + value.substr(currentPos);
      elem.value = newValue;
      elem.selectionEnd = currentPos + 1;
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
      let previewPanel = document.getElementById('markdownPreview');
      // Synchronize the scrollTop property of the other panel
      if (event.target === this.markdownTextarea.nativeElement) {
        previewPanel.scrollTop = scrollTop;
      } else if (event.target === previewPanel) {
        this.markdownTextarea.nativeElement.scrollTop = scrollTop;
      }
    }
  }

  cancelEdit() {
    if (this.editorMode) {
      this.editorMode = false;
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
    if (event.code !== 'Escape') {
      this.keyPressCounter++;
      if (this.keyPressCounter === 20) {
        this.keyPressCounter = 0;
        this.submit();
      }
    }
  }

  startTimer() {
    setInterval(() => {
      if (this.keyPressCounter > 0) {
        this.keyPressCounter = 0;
        this.submit();
      }
    }, 10000);
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
        }, 2000);
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

  getDecodedAccessToken(token: string): any {
    try {
      return jwt_decode(token);
    } catch (Error) {
      return null;
    }
  }
}
