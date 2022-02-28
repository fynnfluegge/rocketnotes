import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from 'aws-amplify';
import { TestServiceService } from 'src/app/service/rest/test-service.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MarkdownService } from 'ngx-markdown';
import { EditorInstance, EditorOption } from 'angular-markdown-editor';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  editorOptions: EditorOption

  constructor(private testService : TestServiceService) { }

  ngOnInit() {
    // this.editorOptions = {
    //   iconlibrary: 'fa',
    //   onChange: (e) => console.log(e.getContent()),
    //   onFullscreenExit: () => this.hidePreview()
    // };
  }

  hidePreview(e: any) { console.log(e.getContent()); }

  onLogout(): void {
    console.log(Auth.currentUserInfo().then((user: any ) => {
      console.log(user.username)
    }))
    Auth.signOut();
  }

  onTest(): void {
    this.testService.get("").subscribe(message => { console.log(message) })
  }
}
