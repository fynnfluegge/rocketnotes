export class Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  lastModified: Date;

  constructor(
    id: string,
    userId: string,
    title: string,
    content: string,
    lastModified: Date,
  ) {
    this.id = id;
    this.userId = userId;
    this.title = title;
    this.content = content;
    this.lastModified = lastModified;
  }
}
