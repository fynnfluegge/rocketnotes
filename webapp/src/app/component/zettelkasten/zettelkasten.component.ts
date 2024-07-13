import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-zettelkasten',
  templateUrl: './zettelkasten.component.html',
  styleUrls: ['./zettelkasten.component.scss'],
})
export class ZettelkastenComponent implements OnInit {
  @Input() showSidebar: boolean;

  constructor() {
    console.log('ZettelkastenComponent.constructor()');
  }

  ngOnInit(): void {}
}
