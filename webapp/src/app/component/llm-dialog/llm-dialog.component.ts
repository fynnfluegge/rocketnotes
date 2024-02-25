import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { LlmDialogService } from 'src/app/service/llm-dialog.service';

@Component({
  selector: 'app-llm-dialog',
  templateUrl: './llm-dialog.component.html',
  styleUrls: ['./llm-dialog.component.scss'],
})
export class LlmDialogComponent implements OnDestroy, OnInit {
  @ViewChild('chatHistory') chatHistory!: ElementRef;
  userInput: string = '';
  messages: string[] = [];
  isOpen: boolean = false;
  subscription: Subscription;

  constructor(
    private http: HttpClient,
    private llmDialogService: LlmDialogService,
  ) {
    this.subscription = this.llmDialogService.isOpen$.subscribe((isOpen) => {
      this.isOpen = isOpen;
      if (isOpen) {
        const overlay = document.getElementById('llmDialog');
        if (overlay.getAttribute('outsideClickListener') !== 'true') {
          overlay.addEventListener('click', (event) => {
            overlay.setAttribute('outsideClickListener', 'true');
            if (event.target === overlay) {
              this.llmDialogService.closeDialog();
              this.userInput = '';
            }
          });
        }
      }
      setTimeout(() => {
        document.getElementById('userInputField').focus();
      }, 0);
    });
  }

  ngOnInit() {
    this.messages.push('ChatGPT: Hi there! How can I help you today?');
    this.messages.push('ChatGPT: You can ask me anything.');
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  sendMessage() {
    const userMessage = this.userInput.trim();
    // if (userMessage) {
    //   this.messages.push('You: ' + userMessage);
    //   this.scrollToBottom();
    //   this.http
    //     .post<any>('YOUR_BACKEND_API_URL', { message: userMessage })
    //     .subscribe((response) => {
    //       this.messages.push('ChatGPT: ' + response.message);
    //       this.scrollToBottom();
    //     });
    //   this.userInput = ''; // Clear input field
    // }
  }

  scrollToBottom() {
    try {
      this.chatHistory.nativeElement.scrollTop =
        this.chatHistory.nativeElement.scrollHeight;
    } catch (err) {}
  }

  openTab(evt, cityName) {
    console.log('openTab');
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName('tabcontent');
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = 'none';
    }
    tablinks = document.getElementsByClassName('tablinks');
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(' active', '');
    }
    document.getElementById(cityName).style.display = 'flex';
    evt.currentTarget.className += ' active';
  }
}
