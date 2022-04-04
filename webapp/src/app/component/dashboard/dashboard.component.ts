import { Component, OnInit} from '@angular/core';
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

  public options: MdEditorOption = {
    showPreviewPanel: false,
    enablePreviewContentClick: false,
    resizable: false,
    customRender: {
      image: function(href: string, title: string, text: string) {
        let out = `<img style="max-width: 100%; border: 20px solid red;" src="${href}" alt="${text}"`;
        if (title) {
          out += ` title="${title}"`;
        }
        out += (<any>this.options).xhtml ? "/>" : ">";
        return out;
      }
    }
  };
  
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
    this.options.showPreviewPanel = !this.options.showPreviewPanel;
    this.options = Object.assign({}, this.options);
  }

  changeMode() {
    if (this.mode === "preview") {
      this.mode = "editor";
    } else {
      this.mode = "preview";
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
    ).subscribe(message => { console.log(message) })
  }

  getDecodedAccessToken(token: string): any {
    try {
      return jwt_decode(token);
    } catch(Error) {
      return null;
    }
  }
}
