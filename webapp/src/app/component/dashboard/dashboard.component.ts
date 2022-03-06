import { Component, OnInit} from '@angular/core';
import { Auth } from 'aws-amplify';
import { TestServiceService } from 'src/app/service/rest/test-service.service';
import { UploadResult, MdEditorOption } from "ngx-markdown-editor";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  public options: MdEditorOption = {
    showPreviewPanel: false,
    enablePreviewContentClick: false,
    resizable: true,
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
  public content: string;
  public mode: string = "editor";

  constructor(private testService : TestServiceService) {
    this.preRender = this.preRender.bind(this);
    this.postRender = this.postRender.bind(this);
   }

  ngOnInit() {
    let contentArr = ["# Hello, Markdown Editor!"];
    contentArr.push("```javascript ");
    contentArr.push("function Test() {");
    contentArr.push('	console.log("Test");');
    contentArr.push("}");
    contentArr.push("```");
    contentArr.push(" Name | Type");
    contentArr.push(" ---- | ----");
    contentArr.push(" A | Test");
    contentArr.push(
      "![](http://lon-yang.github.io/markdown-editor/favicon.ico)"
    );
    contentArr.push("");
    contentArr.push("- [ ] Taks A");
    contentArr.push("- [x] Taks B");
    contentArr.push("- test");
    contentArr.push("");
    contentArr.push("[Link](https://www.google.com)");
    contentArr.push("");
    this.content = contentArr.join("\r\n");
  }

  togglePreviewPanel() {
    this.options.showPreviewPanel = !this.options.showPreviewPanel;
    this.options = Object.assign({}, this.options);
  }

  changeMode() {
    if (this.mode === "editor") {
      this.mode = "preview";
    } else {
      this.mode = "editor";
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
    console.log(`ACE Editor Ins: `, editor);
  }

  preRender(mdContent) {
    console.log(`preRender fired`);
    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve(mdContent);
    //   }, 4000);
    // })
    return mdContent;
  }

  postRender(html) {
    console.log(`postRender fired`);
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

  onTest(): void {
    this.testService.get("").subscribe(message => { console.log(message) })
  }
}
