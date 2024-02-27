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

  constructor(
    private llmDialogService: LlmDialogService,
    private restService: BasicRestService,
  ) {
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
        document.getElementById('userInputField').focus();
      }, 0);
      // for (let i = 0; i < 10; i++) {
      //   setTimeout(() => {
      //     this.messages.push({
      //       text: 'Hello, how can I help you?',
      //       isUser: false,
      //     });
      //     this.messages.push({
      //       text: 'Hello, how can I help you? Hello, how can I help you?',
      //       isUser: true,
      //     });
      //     this.searchResults.push({
      //       title: 'Title',
      //       documentId: 'Document ID',
      //       text: '## header\n\nparagraph',
      //     });
      //     setTimeout(() => {
      //       this.scrollToBottom();
      //     }, 0);
      //   }, 1000);
      // }
    });
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  sendChatMessage() {
    this.messages.push({ text: this.chatInput, isUser: true });
    this.isLoading = true;
    setTimeout(() => {
      this.scrollToBottom();
    }, 0);
    const userMessage = this.chatInput.trim();

    this.restService
      .post('chat', {
        userId: localStorage.getItem('userId'),
        openAiApuKey: localStorage.getItem('openAiApuKey'),
        prompt: userMessage,
      })
      .subscribe((result) => {
        this.isLoading = false;
        this.messages.push({ text: result['answer'], isUser: false });
        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
      });
  }

  sendSearchMessage() {
    const searchInput = this.searchInput.trim();
    this.searchResults = [];
    this.isLoading = true;

    this.restService
      .post('search', {
        userId: localStorage.getItem('userId'),
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

    // Simulate response processing (replace with actual HTTP request)
    // setTimeout(() => {
    //   // Your response processing logic
    //   this.searchResults.push({
    //     title: 'Title',
    //     documentId: 'Document ID',
    //     text: '## header\n\nparagraph',
    //   });
    //   this.searchResults.push({
    //     title: 'Title',
    //     documentId: 'Document ID',
    //     text: '## header\n\nparagraph',
    //   });
    //   this.searchResults.push({
    //     title: 'Title',
    //     documentId: 'Document ID',
    //     text: '## header\n\nparagraph',
    //   });
    //
    //   // Set isLoading to false when response is received
    //   this.isLoading = false;
    // }, 2000); // Simulated delay of 2 seconds
  }

  scrollToBottom() {
    try {
      this.chatHistory.nativeElement.scrollTop =
        this.chatHistory.nativeElement.scrollHeight;
    } catch (err) {}
  }

  openTab(evt: any, tabId: string) {
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
  }
}
