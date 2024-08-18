export class Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  lastModified: Date;
  deleted: boolean;

  constructor(
    id: string,
    title: string,
    content: string,
    userId?: string,
    lastModified?: Date,
    deleted?: boolean,
  ) {
    this.id = id;
    this.userId = userId;
    this.title = title;
    this.content = content;
    this.lastModified = lastModified;
    this.deleted = deleted;
  }
}
