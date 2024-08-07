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
  editMap: Map<string, boolean> = new Map();
  suggestionMap: Record<string, Document[]> = {};

  constructor(private basicRestService: BasicRestService) {
    this.contentMap = this.contentCollection.reduce((map, item) => {
      this.editMap.set(item.id, false);
      map[item.id] = item;
      return map;
    }, {});
  }

  ngOnInit(): void {
    this.basicRestService
      .get('zettelkasten/' + localStorage.getItem('currentUserId'))
      .subscribe((result) => {
        const jsonResult = JSON.parse(JSON.stringify(result));
        jsonResult.forEach((element: any) => {
          this.contentMap[element.id] = new Zettel(
            element.id,
            element.userId,
            element.content,
            element.created,
          );
          this.editMap.set(element.id, false);
        });
      });
  }

  saveNote() {
    const id = uuid.v4();
    if (this.textareaContent.trim()) {
      this.contentMap[id] = new Zettel(
        id,
        localStorage.getItem('currentUserId'),
        this.textareaContent,
        new Date(),
      );
      this.textareaContent = '';
    }
    this.basicRestService
      .post('saveZettel', {
        zettel: this.contentMap[id],
      })
      .subscribe();
  }

  edit(id: string) {
    this.editMap.set(id, true);
  }

  save(id: string) {
    this.editMap.set(id, false);
    this.basicRestService
      .post('saveZettel', { zettel: this.contentMap[id] })
      .subscribe();
  }

  delete(id: string) {
    delete this.contentMap[id];
    this.basicRestService.delete('deleteZettel/' + id).subscribe();
  }

  insert(id: string) {
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
          this,
            this.suggestionMap[id].push(
              new Document(
                element.documentId,
                element.userId,
                element.title,
                element.content,
                element.lastModified,
              ),
            );
        });
      });
  }

  archive(id: string, documentId: string) {
    this.basicRestService
      .post('archiveZettel/' + documentId, this.contentMap[id])
      .subscribe(() => {
        this.delete(id);
      });
  }

  cancelEdit() {
    for (let key of this.editMap.keys()) {
      this.editMap.set(key, false);
    }
  }
}
