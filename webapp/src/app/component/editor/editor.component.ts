import { Component, Input, VERSION } from '@angular/core';
import { Auth } from 'aws-amplify';
import { TestServiceService } from 'src/app/service/rest/test-service.service';
import { UploadResult, MdEditorOption } from "ngx-markdown-editor";
import jwt_decode from 'jwt-decode';
import { ActivatedRoute } from '@angular/router';
import { ChecklistDatabase } from '../navigation/sidenav.component';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent {

  public showPreview: Boolean = false;
  public editorMode: Boolean = false;
  public fullscreen: Boolean = false;

  angularVersion = VERSION.full;
  ngxMarkdownVersion = '12.0.1';
  
  public mode: string = "preview";

  private id: string;
  public title: string ;
  public content: string;

  constructor(private database: ChecklistDatabase, private testService : TestServiceService, private route: ActivatedRoute, private titleService: Title) {
    this.preRender = this.preRender.bind(this);
    this.postRender = this.postRender.bind(this);
  }

  ngOnInit() {

    Auth.currentAuthenticatedUser().then((user) => {
      localStorage.setItem("currentUserId", user.username);
    });

    this.database.initContentChange.subscribe(value => {
      this.id = value.id;
      this.title = value.title;
      this.content = value.content;
      this.titleService.setTitle(value.title);
    });

    this.route.paramMap.subscribe(params => { 
      this.id = params.get('id'); 
      if (this.id) {
        this.testService.get("document/" + this.id).subscribe(message => {
          var document = JSON.parse(JSON.stringify(message))
          this.content = document.content
          this.title = document.title
          this.titleService.setTitle(document.title);
        });
      }
    });
  }

  togglePreviewPanel() {
    this.showPreview = !this.showPreview;
  }

  changeMode() {
    if (this.mode === "preview") {
      this.mode = "editor";
      this.editorMode = true;
    } else {
      this.mode = "preview";
      this.editorMode = false;
    }
  }

  doUpload(files: Array<File>): Promise<Array<UploadResult>> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let result: Array<UploadResult> = [];
        for (let file of files) {
          result.push({
            name: file.name,
            url: `https://avatars3.githubusercontent.com/${file.name}`,
            isImg: file.type.indexOf("image") !== -1
          });
        }
        resolve(result);
      }, 3000);
    });
  }

  onEditorLoaded(editor) {
    // console.log(`ACE Editor Ins: `, editor);
  }

  preRender(mdContent) {
    // console.log(`preRender fired`);
    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve(mdContent);
    //   }, 4000);
    // })
    return mdContent;
  }

  postRender(html) {
    // console.log(`postRender fired`);
    return html;
  }

  onPreviewDomChanged(dom: HTMLElement) {
    // console.log(dom);
    // console.log(dom.innerHTML);
    // console.log(this.content)
  }

  onFullscreen(): void {

  }

  submit(): void{
    this.testService.post("saveDocument", 
      { 
        "id": this.id,
        "userId": localStorage.getItem("currentUserId"),
        "title": this.title,
        "content": this.content
      }
    ).subscribe();
  }

  getDecodedAccessToken(token: string): any {
    try {
      return jwt_decode(token);
    } catch(Error) {
      return null;
    }
  }
}
