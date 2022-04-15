import { Component, VERSION, OnInit} from '@angular/core';
import { Auth } from 'aws-amplify';
import { TestServiceService } from 'src/app/service/rest/test-service.service';
import { UploadResult, MdEditorOption } from "ngx-markdown-editor";
import jwt_decode from 'jwt-decode';
import { from, Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  public showPreview: Boolean = false;
  public editorMode: Boolean = false;
  public fullscreen: Boolean = false;

  angularVersion = VERSION.full;
  ngxMarkdownVersion = '12.0.1';

  markdown = `## Markdown __rulez__!
---

### Syntax highlight
\`\`\`typescript
const language = 'typescript';
\`\`\`

### Lists
1. Ordered list
2. Another bullet point
   - Unordered list
   - Another unordered bullet

### Blockquote
> Blockquote to the max

g

h

k

f

d

z

i

o

s

t

h

m

x

u

i`;
  
  public mode: string = "preview";

  private id: string;
  public title: string ;
  public content: string;
  private typeCounter: Number;

  constructor(private testService : TestServiceService, private route: ActivatedRoute) {
    this.preRender = this.preRender.bind(this);
    this.postRender = this.postRender.bind(this);
  }

  ngOnInit() {

    Auth.currentAuthenticatedUser().then((user) => {
      localStorage.setItem("currentUserId", user.username);
    });

    this.route.paramMap.subscribe(params => { 
      this.id = params.get('id'); 
      this.testService.get("document/" + this.id).subscribe(message => {
        var document = JSON.parse(JSON.stringify(message))
        this.content = document.content
        this.title = document.title
       });

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

  onLogout(): void {
    console.log(Auth.currentUserInfo().then((user: any ) => {
      console.log(user.username)
    }))
    Auth.signOut();
  }

  submit(): void{
    this.testService.post("saveDocument", 
      { 
        "ID": this.id,
        "parentId": "",
        "userId": localStorage.getItem("currentUserId"),
        "title": this.title,
        "content": this.content 
      }
    ).subscribe()
  }

  getDecodedAccessToken(token: string): any {
    try {
      return jwt_decode(token);
    } catch(Error) {
      return null;
    }
  }
}
