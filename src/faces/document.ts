export interface Document {
  _id?: string;
  _v?: number;
  _createdAt?: Date;
  _minedAt?: Date;
  [x: string]: any;
}

export interface QueryDocumentDTO {
  _id?: string;
  _createdAt?: Date;
  _minedAt?: Date;
  [x: string]: any;
}
