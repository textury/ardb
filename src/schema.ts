import Blockweave from 'blockweave';
import { JWKPublicInterface } from 'blockweave/dist/faces/lib/wallet';
import { v4 as uuid } from 'uuid';
import ArDB from './ardb';
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

  async create(data) {
    // validation
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

    // layer of abstraction over the transaction
    return data;
  }

  private validate(data) {
    const dataFields = Object.keys(data);
    if (!this.requriedFields.every((field) => dataFields.includes(field))) throw new Error('required fields missing !');

    dataFields.forEach((prop) => {
      if (typeof data[prop] !== this.schemaTypes[prop]) throw new Error(`invalid ${prop} type`);
    });
  }
  async updateById(id, update) {
    this.validate(update);
    const oldData = {};
    const oldTx = await this.ardb.search('transactions').tag(`${this.prefix}_id`, id).findOne();

    if (!oldTx) return undefined;

    // @ts-ignore
    const tags = oldTx._tags;
    tags.forEach((tag) => {
      const prop = tag.name.split(this.prefix)[1];
      oldData[prop] = tag.value;
    });

    const tx = await this.blockweave.createTransaction({ data: `${Math.random().toString().slice(-4)}` }, this.wallet);
    update[`_id`] = id;
    update[`_v`] = parseInt(oldData[`_v`], 10) + 1;
    update[`_createdAt`] = new Date().toISOString();
    Object.keys(update).forEach((key) => {
      tx.addTag(`${this.prefix}${key}`, update[key]);
    });
    await tx.signAndPost();

    return update;
  }

  async findById(id: string): Promise<any> {
    const data = {};
    const tx = await this.ardb.search('transactions').tag(`${this.prefix}_id`, id).findOne();

    if (!tx) return undefined;
    // @ts-ignore
    const tags = tx._tags;
    tags.forEach((tag) => {
      const prop = tag.name.split(this.prefix)[1];
      data[prop] = tag.value;
    });
    // @ts-ignore
    if (tx._block) {
      // @ts-ignore
      data._minedAt = new Date(tx._block.timestamp * 1000);
    }

    /* ------------------- convert type back ----------------- */
    // @ts-ignore
    data._createdAt = new Date(data._createdAt);
    // @ts-ignore
    data._v = parseInt(data._v, 10);
    Object.keys(this.schemaTypes).forEach((prop: string) => {
      if (this.schemaTypes[prop] === 'number') if (data[prop]) data[prop] = parseInt(data[prop], 10);
    });
    return data;
  }
  async findOne(filter: { name: string; values: string[] | string }[]): Promise<any> {
    const data = {};
    const filterTags = Object.keys(filter).map((key) => ({
      name: `${this.prefix}${key}`,
      values: Array.isArray(filter[key]) ? filter[key] : [`${filter[key]}`],
    }));

    const tx = await this.ardb.search('transactions').tags(filterTags).findOne();
    if (!tx) return undefined;
    // @ts-ignore
    const tags = tx._tags;
    tags.forEach((tag) => {
      const prop = tag.name.split(this.prefix)[1];
      data[prop] = tag.value;
    });
    const lastTxVersion = await this.ardb.search('transactions').tag(`${this.prefix}_id`, data[`_id`]).findOne();
    // @ts-ignore
    const lastV = lastTxVersion._tags.find((tag) => tag.name === `${this.prefix}_v`).value;

    if (lastV !== data[`_v`]) return undefined;
    // @ts-ignore
    if (tx._block) {
      // @ts-ignore
      data._minedAt = new Date(tx._block.timestamp * 1000);
    }

    /* ------------------- convert type back ----------------- */
    // @ts-ignore
    data._createdAt = new Date(data._createdAt);
    // @ts-ignore
    data._v = parseInt(data._v, 10);
    Object.keys(this.schemaTypes).forEach((prop: string) => {
      if (this.schemaTypes[prop] === 'number') if (data[prop]) data[prop] = parseInt(data[prop], 10);
    });
    return data;
  }
  async findMany(filter: { name: string; values: string[] | string }[]) {
    const data = {};
    const filterTags = Object.keys(filter).map((key) => ({
      name: `${this.prefix}${key}`,
      values: Array.isArray(filter[key]) ? filter[key] : [`${filter[key]}`],
    }));

    const txs = await this.ardb.search('transactions').tags(filterTags).findAll();
    if (!txs?.length) return undefined;
    const transactions = [];
    for (const tx of txs) {
      const txData = {};

      // @ts-ignore
      const tags = tx._tags;
      tags.forEach((tag) => {
        const prop = tag.name.split(this.prefix)[1];
        txData[prop] = tag.value;
      });

      const lastTxVersion = await this.ardb.search('transactions').tag(`${this.prefix}_id`, txData[`_id`]).findOne();

      // @ts-ignore
      const lastV = lastTxVersion._tags.find((tag) => tag.name === `${this.prefix}_v`).value;

      if (lastV === txData[`_v`]) {
        /* ------------------- convert type back ----------------- */
        // @ts-ignore
        txData._createdAt = new Date(data._createdAt);
        // @ts-ignore
        txData._v = parseInt(data._v, 10);
        Object.keys(this.schemaTypes).forEach((prop: string) => {
          if (this.schemaTypes[prop] === 'number') if (txData[prop]) txData[prop] = parseInt(txData[prop], 10);
        });
        transactions.push(txData);
      }
    }

    return transactions;
  }
  async updateOne(filter, update) {
    this.validate(update);
    const oldData = {};
    const filterTags = Object.keys(filter).map((key) => ({
      name: `${this.prefix}${key}`,
      values: Array.isArray(filter[key]) ? filter[key] : [`${filter[key]}`],
    }));

    const oldTx = await this.ardb.search('transactions').tags(filterTags).findOne();
    if (!oldTx) return undefined;

    // @ts-ignore
    const tags = oldTx._tags;
    tags.forEach((tag) => {
      const prop = tag.name.split(this.prefix)[1];
      oldData[prop] = tag.value;
    });

    const lastTxVersion = await this.ardb.search('transactions').tag(`${this.prefix}_id`, oldData[`_id`]).findOne();
    // @ts-ignore
    const lastV = lastTxVersion._tags.find((tag) => tag.name === `${this.prefix}_v`).value;

    if (lastV !== oldData[`_v`]) return undefined;

    const tx = await this.blockweave.createTransaction({ data: `${Math.random().toString().slice(-4)}` }, this.wallet);
    update[`_id`] = oldData[`_id`];
    update[`_v`] = parseInt(oldData[`_v`], 10) + 1;
    update[`_createdAt`] = new Date().toISOString();
    Object.keys(update).forEach((key) => {
      tx.addTag(`${this.prefix}${key}`, update[key]);
    });
    await tx.signAndPost();

    return update;
  }
}
