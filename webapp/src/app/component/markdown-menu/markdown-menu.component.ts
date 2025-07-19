import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-markdown-menu',
  templateUrl: './markdown-menu.component.html',
  styleUrls: ['./markdown-menu.component.scss']
})
export class MarkdownMenuComponent {
  @Output() applyMarkdown = new EventEmitter<string>();

  applyStyle(style: string) {
    this.applyMarkdown.emit(style);
  }
}