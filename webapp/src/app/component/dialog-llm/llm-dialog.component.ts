import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { LlmDialogService } from 'src/app/service/llm-dialog.service';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { DocumentTree } from '../navigation/sidenav.component';

type ChatMessage = {
  text: string;
  isUser: boolean;
};

type SearchResult = {
  title: string;
  documentId: string;
  text: string;
};

@Component({
  selector: 'app-llm-dialog',
  templateUrl: './llm-dialog.component.html',
  styleUrls: ['./llm-dialog.component.scss'],
})
export class LlmDialogComponent implements OnDestroy, OnInit {
  @ViewChild('chatHistory') chatHistory!: ElementRef;
  @ViewChild('chatButton') chatButton!: ElementRef;
  @ViewChild('searchResultList') searchResultList!: ElementRef;
  chatInput: string = '';
  searchInput: string = '';
  messages: ChatMessage[] = [];
  searchResults: SearchResult[] = [];
  isOpen: boolean = false;
  subscription: Subscription;
  isLoading: boolean = false;
  activeTab: string = 'tab1';

  constructor(
    private llmDialogService: LlmDialogService,
    private restService: BasicRestService,
    private database: DocumentTree,
  ) {}

  ngOnInit() {
    this.subscription = this.llmDialogService.isOpen$.subscribe((isOpen) => {
      this.isOpen = isOpen;
      if (isOpen) {
        const overlay = document.getElementById('llmDialog');
        if (overlay.getAttribute('outsideClickListener') !== 'true') {
          this.chatButton.nativeElement.click();
          overlay.addEventListener('click', (event) => {
            overlay.setAttribute('outsideClickListener', 'true');
            if (event.target === overlay) {
              this.llmDialogService.closeDialog();
              this.chatInput = '';
              this.searchInput = '';
            }
          });
        }
      }
      setTimeout(() => {
        if (this.activeTab === 'tab1') {
          document.getElementById('chatInput').focus();
        } else {
          document.getElementById('searchInput').focus();
        }
      }, 0);
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  sendChatMessage() {
    const chatMessage = this.chatInput.trim();
    if (chatMessage === '' || this.isLoading) {
      return;
    }
    this.messages.push({ text: this.chatInput, isUser: true });
    this.isLoading = true;
    setTimeout(() => {
      this.scrollToBottom();
    }, 0);

    const userMessage = this.chatInput.trim();
    this.chatInput = '';

    this.restService
      .post('chat', {
        userId: localStorage.getItem('currentUserId'),
        prompt: userMessage,
      })
      .subscribe((result) => {
        this.isLoading = false;
        const resultString = JSON.stringify(result);
        const formattedResult = resultString
          .substring(1, resultString.length - 1)
          .split('\\n')
          .join('<br>');
        this.messages.push({ text: formattedResult, isUser: false });
        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
      });
  }

  sendSearchMessage() {
    const searchInput = this.searchInput.trim();
    if (searchInput === '' || this.isLoading) {
      return;
    }
    this.searchResults = [];
    this.isLoading = true;
    this.searchInput = '';

    this.restService
      .post('semanticSearch', {
        userId: localStorage.getItem('currentUserId'),
        searchString: searchInput,
      })
      .subscribe((result) => {
        this.isLoading = false;
        const jsonResult = JSON.parse(JSON.stringify(result));
        jsonResult.forEach((element: any) => {
          this.searchResults.push({
            title: element.title,
            documentId: element.documentId,
            text: element.content,
          });
        });
      });
  }

  scrollToBottom() {
    try {
      this.chatHistory.nativeElement.scrollTop =
        this.chatHistory.nativeElement.scrollHeight;
    } catch (err) {}
  }

  openTab(evt: any, tabId: string) {
    this.activeTab = tabId;
    var i: number, tabcontent: any, tablinks: any;
    tabcontent = document.getElementsByClassName('tabcontent');
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = 'none';
    }
    tablinks = document.getElementsByClassName('tablinks');
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(' active', '');
    }
    document.getElementById(tabId).style.display = 'flex';
    evt.currentTarget.className += ' active';
    if (tabId === 'tab1') {
      setTimeout(() => {
        document.getElementById('chatInput').focus();
      }, 0);
    } else {
      setTimeout(() => {
        document.getElementById('searchInput').focus();
      }, 0);
    }
  }

  openDocument(searchResult: SearchResult) {
    this.database.initContentChange.next({
      id: searchResult.documentId,
      title: searchResult.title,
      content: searchResult.text,
      isPublic: false,
    });
  }

  resizeTextarea(event: any) {
    // event.target.style.height = 'auto';
    // event.target.style.height = event.target.scrollHeight + 'px';
  }

  onKeydown(event: any) {
    if (event.code === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // if (this.activeTab === 'tab1') {
      //   this.sendChatMessage();
      // } else {
      //   this.sendSearchMessage();
      // }
    }
  }
}
