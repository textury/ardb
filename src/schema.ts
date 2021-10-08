import Blockweave from 'blockweave';
import { JWKPublicInterface } from 'blockweave/dist/faces/lib/wallet';
import { v4 as uuid } from 'uuid';
import ArDB from './ardb';
import { Document } from './faces/document';
import { Tag } from './faces/tag';
import ArdbTransaction from './models/transaction';
export class Schema {
  private schemaTypes = {};
  private requriedFields: string[] = [];
  private blockweave: Blockweave;
  private wallet: JWKPublicInterface;
  private prefix = '__%$';
  private ardb: ArDB;

  constructor(schema: any = {}, blockweave: Blockweave, key: JWKPublicInterface, ardb: ArDB) {
    Object.keys(schema).forEach((prop) => {
      if (schema[prop].required !== false) this.requriedFields.push(prop);
      this.schemaTypes[prop] = typeof schema[prop] === 'string' ? schema[prop] : schema[prop].type;
    });
    this.blockweave = blockweave;
    this.wallet = key;
    this.ardb = ardb;
  }

  async create(data): Promise<Document> {
    this.validate(data);
    const tx = await this.blockweave.createTransaction({ data: `${Math.random().toString().slice(-4)}` }, this.wallet);
    let id = uuid();
    while (await this.findById(id)) id = uuid();
    data[`_id`] = id;
    data[`_v`] = 1;
    data[`_createdAt`] = new Date().toISOString();
    Object.keys(data).forEach((key) => {
      tx.addTag(`${this.prefix}${key}`, data[key]);
    });
    await tx.signAndPost();

    return data;
  }

  async findById(id: string): Promise<Document> {
    const tx = (await this.ardb.search('transactions').tag(`${this.prefix}_id`, id).findOne()) as ArdbTransaction;

    if (!tx) return undefined;

    const data = this.formatTags(tx.tags);

    const minedAt = tx.block?.timestamp;
    if (minedAt) {
      data._minedAt = new Date(minedAt * 1000);
    }

    this.convertType(data);
    return data;
  }
  async findOne(filter: Tag): Promise<Document> {
    const filterTags = this.formatFilter(filter);

    const tx = (await this.ardb.search('transactions').tags(filterTags).findOne()) as ArdbTransaction;
    if (!tx) return undefined;

    const data = this.formatTags(tx.tags);

    if (!(await this.isLastV(data[`_id`], data[`_v`]))) return undefined;

    const minedAt = tx.block?.timestamp;
    if (minedAt) {
      data._minedAt = new Date(minedAt * 1000);
    }

    this.convertType(data);
    return data;
  }
  async findMany(filter: Tag): Promise<Document[]> {
    const filterTags = this.formatFilter(filter);

    const txs = (await this.ardb.search('transactions').tags(filterTags).findAll()) as ArdbTransaction[];
    if (!txs?.length) return undefined;
    const transactions = [];
    for (const tx of txs) {
      const txData = this.formatTags(tx.tags);

      if (await this.isLastV(txData[`_id`], txData[`_v`])) {
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

  async history(id: string): Promise<Document[]> {
    const txs = (await this.ardb.search('transactions').tag(`${this.prefix}_id`, id).findAll()) as ArdbTransaction[];

    if (!txs?.length) return undefined;
    const transactions = [];
    for (const tx of txs) {
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

  async updateById(id: string, update: Document): Promise<Document> {
    this.validate(update);
    const oldTx = (await this.ardb.search('transactions').tag(`${this.prefix}_id`, id).findOne()) as ArdbTransaction;

    if (!oldTx) return undefined;

    const oldData = this.formatTags(oldTx.tags);

    await this.createNewVersion(oldData, update);

    return update;
  }
  async updateOne(filter: Tag, update: Document): Promise<Document> {
    this.validate(update);
    const filterTags = this.formatFilter(filter);

    const oldTx = (await this.ardb.search('transactions').tags(filterTags).findOne()) as ArdbTransaction;
    if (!oldTx) return undefined;

    const oldData = this.formatTags(oldTx.tags);

    if (!(await this.isLastV(oldData[`_id`], oldData[`_v`]))) return undefined;

    await this.createNewVersion(oldData, update);

    return update;
  }
  async updateMany(filter: Tag, update: Document): Promise<Document[]> {
    this.validate(update);
    const filterTags = this.formatFilter(filter);
    const txs = (await this.ardb.search('transactions').tags(filterTags).findAll()) as ArdbTransaction[];
    if (!txs?.length) return undefined;

    const transactions = [];
    for (const tx of txs) {
      const updatedData = { ...update };

      const oldData = this.formatTags(tx.tags);

      if (await this.isLastV(oldData[`_id`], oldData[`_v`])) {
        await this.createNewVersion(oldData, updatedData);
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

  private formatTags(tags: Tag[]): Document {
    const doc: Document = {};
    tags.forEach((tag) => {
      const prop = tag.name.split(this.prefix)[1];
      doc[prop] = tag.value;
    });
    return doc;
  }
  private formatFilter(filter: Tag): Tag[] {
    return Object.keys(filter).map((key) => ({
      name: `${this.prefix}${key}`,
      value: Array.isArray(filter[key]) ? filter[key] : [`${filter[key]}`],
    }));
  }
  private async isLastV(id, v) {
    const lastTxVersion = (await this.ardb
      .search('transactions')
      .tag(`${this.prefix}_id`, id)
      .findOne()) as ArdbTransaction;

    const lastV = lastTxVersion.tags.find((tag) => tag.name === `${this.prefix}_v`).value;

    return lastV === v;
  }

  private convertType(data: Document) {
    data._createdAt = new Date(data._createdAt);

    data._v = parseInt(data._v.toString(), 10);
    Object.keys(this.schemaTypes).forEach((prop: string) => {
      if (this.schemaTypes[prop] === 'number') if (data[prop]) data[prop] = parseInt(data[prop], 10);
    });
  }

  private async createNewVersion(oldData: Document, update: Document) {
    const tx = await this.blockweave.createTransaction({ data: `${Math.random().toString().slice(-4)}` }, this.wallet);
    update._id = oldData._id;
    update._v = parseInt(oldData._v.toString(), 10) + 1;
    update._createdAt = new Date();
    Object.keys(update).forEach((key) => {
      tx.addTag(`${this.prefix}${key}`, update[key]);
    });
    await tx.signAndPost();
  }
}
