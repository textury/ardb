import Blockweave from 'blockweave';
import { JWKPublicInterface } from 'blockweave/dist/faces/lib/wallet';
import { v4 as uuid } from 'uuid';
import { Query } from './query';
import { Document, QueryDocumentDTO } from './faces/document';
import { Tag } from './faces/tag';
import ArdbTransaction from './models/transaction';
import { GQLTagInterface } from './faces/gql';
export default class Schema<T = {}> {
  private schemaTypes = {};
  private requriedFields: string[] = [];
  private indexedFields: string[] = [`_id`, `_v`, `_createdAt`];
  private blockweave: Blockweave;
  private wallet: JWKPublicInterface;
  private prefix = '__%$';
  private query: Query;

  constructor(schema: any = {}, blockweave: Blockweave, key: JWKPublicInterface) {
    Object.keys(schema).forEach((prop) => {
      if (schema[prop].required !== false) this.requriedFields.push(prop);
      if (schema[prop].indexed !== false) this.indexedFields.push(prop);
      this.schemaTypes[prop] = typeof schema[prop] === 'string' ? schema[prop] : schema[prop].type;
    });
    this.blockweave = blockweave;
    this.wallet = key;
    this.query = new Query(blockweave);
  }

  async create(data: T): Promise<Document & T> {
    this.validate(data);

    let id = uuid();
    while (await this.findById(id)) id = uuid();
    data[`_id`] = id;
    data[`_v`] = 1;
    data[`_createdAt`] = new Date().toISOString();

    const notIndexed = [];
    const tags = [];
    let txData = `${Math.random().toString().slice(-4)}`;

    Object.keys(data).forEach((key) => {
      if (this.indexedFields.includes(key)) tags.push({ [`${this.prefix}${key}`]: data[key] });
      else notIndexed.push({ name: `${this.prefix}${key}`, value: data[key] });
    });
    if (notIndexed.length) txData = JSON.stringify(notIndexed);

    const tx = await this.blockweave.createTransaction({ data: txData }, this.wallet);

    tags.forEach((tag) => {
      const key = Object.keys(tag)[0];
      tx.addTag(key, tag[key]);
    });

    if (notIndexed.length) tx.addTag(`${this.prefix}notIndexedData`, '1');
    await tx.signAndPost();

    return data;
  }

  async findById(id: string, opt = { getData: false }): Promise<Document & T> {
    const tx = await this.query.tag(`${this.prefix}_id`, id).findOne();
    if (!tx) return undefined;

    if (opt.getData && this.notIndexedDataAvailable(tx)) {
      await this.addDataToTags(tx);
    }

    const data = this.formatTags(tx.tags);
    data._txId = tx.id;

    const minedAt = tx.block?.timestamp;
    if (minedAt) {
      data._minedAt = new Date(minedAt * 1000);
    }

    this.convertType(data);

    return data;
  }

  async findOne(filter: QueryDocumentDTO & { [P in keyof T]?: T[P] }, opt = { getData: false }): Promise<Document & T> {
    const filterTags = this.formatFilter(filter);

    const tx = await this.query.tags(filterTags).findOne();
    if (!tx) return undefined;

    let data = this.formatTags(tx.tags);

    if (!(await this.isLastV(data[`_id`], data[`_v`]))) return undefined;

    if (opt.getData && this.notIndexedDataAvailable(tx)) {
      await this.addDataToTags(tx);
      data = this.formatTags(tx.tags);
    }
    data._txId = tx.id;

    const minedAt = tx.block?.timestamp;
    if (minedAt) {
      data._minedAt = new Date(minedAt * 1000);
    }

    this.convertType(data);

    return data;
  }
  async findMany(
    filter: QueryDocumentDTO & { [P in keyof T]?: T[P] },
    opt = { getData: false }
  ): Promise<Document[] & T[]> {
    const filterTags = this.formatFilter(filter);

    const txs = await this.query.tags(filterTags).findAll();
    if (!txs?.length) return undefined;

    const txsId = [...new Set(txs.map((tx) => this.getIdTags(tx.tags)))];
    const lastTxsData = await this.getLastVTxData(txsId);

    const transactions = [];
    for (const tx of txs) {
      let txData = this.formatTags(tx.tags);

      const lastTx = lastTxsData.find((Tx) => Tx._id === txData._id && Tx._v === txData._v);

      if (lastTx) {
        if (opt.getData && this.notIndexedDataAvailable(tx)) {
          await this.addDataToTags(tx);
          txData = this.formatTags(tx.tags);
        }
        txData._txId = tx.id;

        const minedAt = tx.block?.timestamp;
        if (minedAt) {
          txData._minedAt = new Date(minedAt * 1000);
        }

        this.convertType(txData);
        transactions.push(txData);
      }
    }

    return transactions;
  }

  async getData(document: Document & T) {
    if (!document.notIndexedData) return;

    const tx = await this.blockweave.transactions.get(document._txId);
    const enc = new TextDecoder('utf-8');
    const notIndexedData = JSON.parse(enc.decode(tx.data)) as GQLTagInterface[];
    notIndexedData.forEach((data) => {
      const prop = data.name.split(this.prefix)[1];
      Object.assign(document, { [prop]: data.value });
    });
  }

  async history(id: string, opt = { getData: false }): Promise<Document[] & T[]> {
    const txs = await this.query.tag(`${this.prefix}_id`, id).findAll();

    if (!txs?.length) return undefined;
    const transactions = [];
    for (const tx of txs) {
      if (opt.getData && this.notIndexedDataAvailable(tx)) {
        await this.addDataToTags(tx);
      }
      const txData = this.formatTags(tx.tags);

      const minedAt = tx.block?.timestamp;
      if (minedAt) {
        txData._minedAt = new Date(minedAt * 1000);
      }

      this.convertType(txData);

      transactions.push(txData);
    }

    return transactions;
  }

  async updateById(id: string, update: T): Promise<Document & T> {
    this.validate(update);
    const oldTx = await this.query.tag(`${this.prefix}_id`, id).findOne();

    if (!oldTx) return undefined;

    const oldData = this.formatTags(oldTx.tags);

    const updatedData = await this.createNewVersion(oldData, update);

    return updatedData;
  }
  async updateOne(filter: QueryDocumentDTO & { [P in keyof T]?: T[P] }, update: T): Promise<Document & T> {
    this.validate(update);
    const filterTags = this.formatFilter(filter);

    const oldTx = await this.query.tags(filterTags).findOne();
    if (!oldTx) return undefined;

    const oldData = this.formatTags(oldTx.tags);

    if (!(await this.isLastV(oldData[`_id`], oldData[`_v`]))) return undefined;

    const updatedData = await this.createNewVersion(oldData, update);

    return updatedData;
  }
  async updateMany(filter: QueryDocumentDTO & { [P in keyof T]?: T[P] }, update: T): Promise<Document[] & T[]> {
    this.validate(update);
    const filterTags = this.formatFilter(filter);
    const txs = await this.query.tags(filterTags).findAll();
    if (!txs?.length) return undefined;

    const txsId = [...new Set(txs.map((tx) => this.getIdTags(tx.tags)))];
    const lastTxsData = await this.getLastVTxData(txsId);

    const transactions = [];
    for (const tx of txs) {
      const oldData = this.formatTags(tx.tags);

      const lastTx = lastTxsData.find((Tx) => Tx._id === oldData._id && Tx._v === oldData._v);
      if (lastTx) {
        const updatedData = await this.createNewVersion(oldData, update);
        transactions.push(updatedData);
      }
    }
    return transactions;
  }

  private validate(data) {
    const dataFields = Object.keys(data);
    if (!this.requriedFields.every((field) => dataFields.includes(field))) throw new Error('required fields missing !');

    dataFields.forEach((prop) => {
      if (typeof data[prop] !== this.schemaTypes[prop]) throw new Error(`invalid ${prop} type`);
    });
  }

  private formatTags(tags: Tag[]): Document & T {
    const doc: any = {};
    tags.forEach((tag) => {
      const prop = tag.name.split(this.prefix)[1];
      doc[prop] = tag.value;
    });
    return doc;
  }
  private getIdTags(tags: Tag[]): string {
    return tags.find((tag) => tag.name === `${this.prefix}_id`).value as string;
  }
  private formatFilter(filter: Document): Tag[] {
    return Object.keys(filter).map((key) => ({
      name: `${this.prefix}${key}`,
      value: Array.isArray(filter[key]) ? filter[key] : [`${filter[key]}`],
    }));
  }
  private async isLastV(id: string, v: number): Promise<boolean> {
    const lastTxVersion = await this.query.tag(`${this.prefix}_id`, id).findOne();

    const lastV = lastTxVersion.tags.find((tag) => tag.name === `${this.prefix}_v`).value;

    return lastV === v.toString();
  }
  private notIndexedDataAvailable(tx: ArdbTransaction) {
    return !!tx.tags.find((tag) => tag.name === `${this.prefix}_v`);
  }

  private async getLastVTxData(txsId): Promise<Document[] & T[]> {
    return (await Promise.all(txsId.map(async (id) => await this.query.tag(`${this.prefix}_id`, id).findOne()))).map(
      (tx: ArdbTransaction) => this.formatTags(tx.tags)
    );
  }

  private convertType(data: Document) {
    data._createdAt = new Date(data._createdAt);

    data._v = parseInt(data._v.toString(), 10);
    Object.keys(this.schemaTypes).forEach((prop: string) => {
      if (this.schemaTypes[prop] === 'number') if (data[prop]) data[prop] = parseInt(data[prop], 10);
    });
  }

  private async createNewVersion(oldData: Document, update: T): Promise<Document & T> {
    const updatedData: Document & T = { ...update };
    updatedData._id = oldData._id;
    updatedData._v = parseInt(oldData._v.toString(), 10) + 1;
    updatedData._createdAt = new Date();

    const notIndexed = [];
    const tags = [];
    let txData = `${Math.random().toString().slice(-4)}`;

    Object.keys(updatedData).forEach((key) => {
      if (this.indexedFields.includes(key)) tags.push({ [`${this.prefix}${key}`]: updatedData[key] });
      else notIndexed.push({ name: `${this.prefix}${key}`, value: updatedData[key] });
    });
    if (notIndexed.length) txData = JSON.stringify(notIndexed);

    const tx = await this.blockweave.createTransaction({ data: txData }, this.wallet);

    tags.forEach((tag) => {
      const key = Object.keys(tag)[0];
      tx.addTag(key, tag[key]);
    });
    await tx.signAndPost();

    return updatedData;
  }

  private async addDataToTags(tx) {
    const transaction = await this.blockweave.transactions.get(tx.id);
    const enc = new TextDecoder('utf-8');
    const notIndexedData = JSON.parse(enc.decode(transaction.data)) as GQLTagInterface[];
    notIndexedData.forEach((nid) => tx.tags.push(nid));
  }
}
