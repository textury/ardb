export interface Document {
  _id?: string;
  _txId?: string;
  _v?: number;
  _createdAt?: Date;
  _minedAt?: Date;
  notIndexedData?: string;
}

export interface QueryDocumentDTO {
  _id?: string;
  _createdAt?: Date;
  _minedAt?: Date;
}
