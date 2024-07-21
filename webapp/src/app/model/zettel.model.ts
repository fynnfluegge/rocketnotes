export class Zettel {
  id: string;
  userId: string;
  content: string;
  created: Date;

  constructor(id: string, userId: string, content: string, created: Date) {
    this.id = id;
    this.userId = userId;
    this.content = content;
    this.created = created;
  }
}
