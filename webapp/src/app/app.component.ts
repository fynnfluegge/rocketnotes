import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Document } from './model/document.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'webapp';
  document: Document

  constructor(private router: Router){
  }
}
