import { Component, Input, OnInit } from '@angular/core';
import { Document } from 'src/app/model/document.model';
import { Zettel } from 'src/app/model/zettel.model';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import * as uuid from 'uuid';

@Component({
  selector: 'app-zettelkasten',
  templateUrl: './zettelkasten.component.html',
  styleUrls: ['./zettelkasten.component.scss'],
})
export class ZettelkastenComponent implements OnInit {
  @Input() showSidebar: boolean;

  textareaContent: string = '';
  contentCollection: Zettel[] = [
    {
      id: '1',
      userId: '1',
      content: 'This is the content of Zettel 1',
      created: new Date(),
    },
    {
      id: '2',
      userId: '1',
      content: 'This is the content of Zettel 2',
      created: new Date(),
    },
    {
      id: '3',
      userId: '1',
      content: 'This is the content of Zettel 3',
      created: new Date(),
    },
  ];
  contentMap: Record<string, Zettel> = {};
  editMap: Record<string, boolean> = {};
  suggestionMap: Record<string, Document[]> = {};

  constructor(private basicRestService: BasicRestService) {
    this.contentMap = this.contentCollection.reduce((map, item) => {
      this.editMap[item.id] = false;
      map[item.id] = item;
      return map;
    }, {});
  }

  ngOnInit(): void {}

  addContent() {
    if (this.textareaContent.trim()) {
      this.contentMap[uuid.v4()] = new Zettel(
        uuid.v4(),
        localStorage.getItem('currentUserId'),
        this.textareaContent,
        new Date(),
      );
      this.textareaContent = '';
    }
  }

  edit(id: string) {
    this.editMap[id] = true;
  }

  save(id: string) {
    this.editMap[id] = false;
    this.basicRestService.post('saveZettel', this.contentMap[id]);
  }

  delete(id: string) {
    delete this.contentMap[id];
    this.basicRestService.delete('deleteZettelkasten/' + id);
  }

  insert(id: string) {
    this.suggestionMap[id] = [
      new Document(
        '1',
        '1',
        'This is the title of the suggestion',
        '## This is the content of the suggestion\n - This is a bullet point\n - This is another bullet point\n\nThis is a new paragraph',
        new Date(),
      ),
    ];

    this.basicRestService
      .post('semanticSearch', {
        userId: localStorage.getItem('currentUserId'),
        searchString: this.contentMap[id].content,
      })
      .subscribe((result) => {
        // this.isLoading = false;
        this.suggestionMap[id] = [];
        const jsonResult = JSON.parse(JSON.stringify(result));
        jsonResult.forEach((element: any) => {
          this.suggestionMap[id][element.documentId] = new Document(
            element.documentId,
            element.userId,
            element.title,
            element.content,
            element.lastModified,
          );
        });
      });
  }

  archive(id: string, documentId: string) {
    this.basicRestService.post(
      'archiveZettel/' + documentId,
      this.contentMap[id],
    );
  }
}
