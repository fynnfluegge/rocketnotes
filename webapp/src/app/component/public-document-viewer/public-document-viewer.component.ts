import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { BasicRestService } from 'src/app/service/basic-rest.service';

@Component({
  selector: 'app-public-document-viewer',
  templateUrl: './public-document-viewer.component.html',
  styleUrls: ['./public-document-viewer.component.scss']
})
export class PublicDocumentViewerComponent implements OnInit {

  private id: string;
  public title: string;
  public content: string;

  constructor(private testService : BasicRestService, private route: ActivatedRoute, private titleService: Title) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => { 
      this.id = params.get('id');
      if (this.id) {
        this.testService.get("shared/" + this.id).subscribe(message => {
          var document = JSON.parse(JSON.stringify(message))
          this.content = document.content
          this.title = document.title
          this.titleService.setTitle(document.title);
        });
      }
    });
  }

}
