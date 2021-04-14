import Arweave from 'arweave';
import { fieldType } from './faces/fields';
import GQLResultInterface, {
  GQLBlocksInterface,
  GQLEdgeBlockInterface,
  GQLEdgeTransactionInterface,
  GQLTransactionsResultInterface,
} from './faces/gql';
import {
  IBlockOptions,
  IBlocksOptions,
  IGlobalOptions,
  ITransactionOptions,
  ITransactionsOptions,
  RequestType,
} from './faces/options';

/**
 * Arweave as a database.
 * To easily interact with Arweave's graphql endpoint.
 */
export default class ArDB {
  private arweave: Arweave;
  private reqType: RequestType = 'transactions';
  private options: IGlobalOptions = {};
  private logs: number = 2;
  private after: string = '';
  private readonly afterRegex = /after: *"([^"]*)"/gi;
  private readonly emptyLinesRegex = /^\s*[\r\n]/gm;
  private readonly fields: fieldType[] = [
    'id',
    'anchor',
    'signature',
    'recipient',
    'owner',
    'owner.address',
    'owner.key',
    'fee',
    'fee.winston',
    'fee.ar',
    'quantity',
    'quantity.winston',
    'quantity.ar',
    'data',
    'data.size',
    'data.type',
    'tags',
    'tags.name',
    'tags.value',
    'block',
    'block.id',
    'block.timestamp',
    'block.height',
    'block.previous',
    'parent',
    'parent.id',
  ];

  private includes: Set<fieldType> = new Set();

  /**
   *
   * @param arweave An arweave instance
   * @param logs Show logs. 0 = false, 1 = true, 2 = if arweave instance has log enabled.
   */
  constructor(arweave: Arweave, logs: number = 2) {
    this.arweave = arweave;
    this.logs = logs;

    this.includes = new Set(this.fields);
  }

  /**
   * Search is the first function called before doing a find.
   * @param type What type of search are we going to do.
   */
  search(type: RequestType = 'transactions') {
    this.reqType = type;

    this.options = {};
    this.after = '';

    return this;
  }

  id(id: string) {
    this.checkSearchType();
    this.options.id = id;
    this.options.ids = [id];

    return this;
  }
  ids(ids: string[]) {
    this.checkSearchType();
    this.options.ids = ids;
    this.options.id = ids[0];

    return this;
  }

  appName(name: string) {
    this.checkSearchType();
    this.tag('App-Name', [name]);

    return this;
  }

  type(type: string) {
    this.checkSearchType();
    this.tag('Content-Type', [type]);

    return this;
  }

  tags(tags: { name: string; values: string[] }[]) {
    this.checkSearchType();
    this.options.tags = tags;

    return this;
  }

  tag(name: string, values: string | string[]) {
    this.checkSearchType();

    if (!this.options.tags) {
      this.options.tags = [];
    }
    if (typeof values === 'string') {
      values = [values];
    }
    this.options.tags.push({ name, values });

    return this;
  }

  from(owners: string | string[]) {
    this.checkSearchType();

    if (typeof owners === 'string') {
      owners = [owners];
    }
    this.options.owners = owners;

    return this;
  }

  to(recipients: string | string[]) {
    this.checkSearchType();

    if (typeof recipients === 'string') {
      recipients = [recipients];
    }
    this.options.recipients = recipients;

    return this;
  }

  min(min: number) {
    this.checkSearchType();

    if (!this.options.block) {
      this.options.block = {};
    }
    this.options.block.min = min;

    return this;
  }

  max(max: number) {
    this.checkSearchType();

    if (!this.options.block) {
      this.options.block = {};
    }
    this.options.block.max = max;

    return this;
  }

  limit(limit: number) {
    this.checkSearchType();

    if (limit < 1) {
      console.warn('Limit cannot be less than 1, setting it to 1.');
      limit = 1;
    } else if (limit > 100) {
      console.warn("Arweave GQL won't return more than 100 entries at once.");
    }

    this.options.first = limit;

    return this;
  }

  sort(sort: 'HEIGHT_DESC' | 'HEIGHT_ASC') {
    this.options.sort = sort;

    return this;
  }

  cursor(after: string) {
    this.checkSearchType();
    this.options.after = after;

    return this;
  }

  only(fields: fieldType | fieldType[]) {
    // Empty the included fields.
    this.includes = new Set();

    if (typeof fields === 'string' && this.fields.indexOf(fields) !== -1) {
      this.includes.add(fields);
      return this;
    }

    const toInclude: fieldType[] = [];
    for (const field of fields) {
      // @ts-ignore
      if (this.fields.indexOf(field) !== -1) {
        // @ts-ignore
        toInclude.push(field);
      }
    }

    if (toInclude.length) {
      this.includes = new Set(toInclude);
    }

    this.validateIncludes();
    return this;
  }

  exclude(fields: fieldType | fieldType[]) {
    // To make only() and exclude() work the same, re-add all fields to includes.
    this.includes = new Set(this.fields);

    if (typeof fields === 'string') {
      this.includes.delete(fields);
      return this;
    }

    for (const field of fields) {
      this.includes.delete(field);
    }

    this.validateIncludes();
    return this;
  }

  // Ready to run

  async find(filters: IGlobalOptions = {}) {
    this.checkSearchType();

    for (const filter of Object.keys(filters)) {
      this.options[filter] = filters[filter];
    }

    if (!this.options.first) {
      this.options.first = 10;
    }

    const query = this.construct();
    return this.run(query);
  }
  async findOne(filters: IGlobalOptions = {}) {
    this.checkSearchType();

    for (const filter of Object.keys(filters)) {
      this.options[filter] = filters[filter];
    }
    this.options.first = 1;

    const query = this.construct();
    return this.run(query);
  }

  async findAll(filters: IGlobalOptions = {}) {
    this.checkSearchType();

    for (const filter of Object.keys(filters)) {
      this.options[filter] = filters[filter];
    }
    this.options.first = 100;

    const query = this.construct();
    return this.runAll(query);
  }
  /**
   * To run with the cursor
   */
  async next() {
    if (!this.after || !this.after.length) {
      console.warn('next(): Nothing more to search.');
      return;
    }

    const query = this.construct().replace(this.afterRegex, `after: "${this.after}"`);
    return this.run(query);
  }

  async run(query: string) {
    this.log('Running query:');
    this.log(query);

    const res: GQLResultInterface = await this.get(query);

    if (res.transaction) {
      return res.transaction;
    } else if (res.block) {
      return res.block;
    } else if (res.transactions) {
      const edges = res.transactions.edges;
      if (edges && edges.length) {
        this.after = edges[edges.length - 1].cursor;
      } else {
        this.after = '';
      }
      return edges;
    } else if (res.blocks) {
      const edges = res.blocks.edges;
      if (edges && edges.length) {
        this.after = edges[edges.length - 1].cursor;
      } else {
        this.after = '';
      }
      return edges;
    }
  }

  async runAll(query: string) {
    let hasNextPage: boolean = true;
    let edges: any[] = [];
    let cursor = this.options.after || '';

    while (hasNextPage) {
      this.log('Running query:');
      this.log(query);

      const res: GQLResultInterface = await this.get(query);

      if (res.transaction) {
        return res.transaction;
      } else if (res.block) {
        return res.block;
      } else if (res.transactions) {
        const r = res.transactions;
        if (r.edges && r.edges.length) {
          edges = edges.concat(r.edges);
          cursor = r.edges[r.edges.length - 1].cursor;
          query = query.replace(this.afterRegex, `after: "${cursor}"`);
        }
        hasNextPage = r.pageInfo.hasNextPage;
      } else if (res.blocks) {
        const r = res.blocks;
        if (r.edges && r.edges.length) {
          edges = edges.concat(r.edges);
          cursor = r.edges[r.edges.length - 1].cursor;
          query = query.replace(this.afterRegex, `after: "${cursor}"`);
        }
        hasNextPage = r.pageInfo.hasNextPage;
      }
    }

    return edges;
  }

  /** Helpers */
  private checkSearchType() {
    if (
      !this.reqType ||
      (this.reqType !== 'transaction' &&
        this.reqType !== 'block' &&
        this.reqType !== 'transactions' &&
        this.reqType !== 'blocks')
    ) {
      throw new Error(
        'Invalid search type. Must provide one and it must be either "transaction", "transactions", "block" or "blocks"'
      );
    }
  }

  private async get(query: string): Promise<GQLResultInterface> {
    const res = await this.arweave.api.post('graphql', { query }, { headers: { 'content-type': 'application/json' } });
    this.log('Returned result: ');
    this.log(res.data.data);
    return res.data.data;
  }

  private construct(): string {
    if (this.reqType === 'transactions' || this.reqType === 'blocks') {
      delete this.options.id;
      if (this.reqType === 'transactions') {
        delete this.options.height;
      } else {
        delete this.options.owners;
        delete this.options.recipients;
        delete this.options.tags;
        delete this.options.block;
      }

      if (!this.options.after) {
        this.options.after = '';
      }
    } else {
      this.options = { id: this.options.id };
    }

    let params: string = JSON.stringify(this.options, null, 2).replace(/"([^"]+)":/gm, '$1: ');
    params = params.substring(1, params.length - 1);

    let fields: string = '';
    if (this.reqType === 'transaction' || this.reqType === 'transactions') {
      let owner = '';
      if (this.includes.has('owner')) {
        owner = `owner {
          ${this.includes.has('owner.address') ? 'address' : ''}
          ${this.includes.has('owner.key') ? 'key' : ''}
        }`;
      }

      let fee = '';
      if (this.includes.has('fee')) {
        fee = `fee {
          ${this.includes.has('fee.winston') ? 'winston' : ''}
          ${this.includes.has('fee.ar') ? 'ar' : ''}
        }`;
      }

      let quantity = '';
      if (this.includes.has('quantity')) {
        quantity = `quantity {
          ${this.includes.has('quantity.winston') ? 'winston' : ''}
          ${this.includes.has('quantity.ar') ? 'ar' : ''}
        }`;
      }

      let data = '';
      if (this.includes.has('data')) {
        data = `data {
          ${this.includes.has('data.size') ? 'size' : ''}
          ${this.includes.has('data.type') ? 'type' : ''}
        }`;
      }

      let tags = '';
      if (this.includes.has('tags')) {
        tags = `tags {
          ${this.includes.has('tags.name') ? 'name' : ''}
          ${this.includes.has('tags.value') ? 'value' : ''}
        }`;
      }

      let block = '';
      if (this.includes.has('block')) {
        block = `block {
          ${this.includes.has('block.id') ? 'id' : ''}
          ${this.includes.has('block.timestamp') ? 'timestamp' : ''}
          ${this.includes.has('block.height') ? 'height' : ''}
          ${this.includes.has('block.previous') ? 'previous' : ''}
        }`;
      }

      let parent = '';
      if (this.includes.has('parent') || this.includes.has('parent.id')) {
        // Parent only has an ID, so if one of them is included, add both.
        parent = `parent {
          id
        }`;
      }

      fields = `
      ${this.includes.has('id') ? 'id' : ''}
      ${this.includes.has('anchor') ? 'anchor' : ''}
      ${this.includes.has('signature') ? 'signature' : ''}
      ${this.includes.has('recipient') ? 'recipient' : ''}
      ${owner}
      ${fee}
      ${quantity}
      ${data}
      ${tags}
      ${block}
      ${parent}
      `;

      fields = fields.replace(this.emptyLinesRegex, '').trim();
      if (!fields.length) {
        fields = `
        id
        anchor
        signature
        recipient
        owner {
          address
          key
        }
        fee {
          winston
          ar
        }
        quantity {
          winston
          ar
        }
        data {
          size
          type
        }
        tags {
          name
          value
        }
        block {
          id
          timestamp
          height
          previous
        }
        parent {
          id
        }`;
      }
    } else {
      fields = `
      ${this.includes.has('block.id') ? 'id' : ''}
      ${this.includes.has('block.timestamp') ? 'timestamp' : ''}
      ${this.includes.has('block.height') ? 'height' : ''}
      ${this.includes.has('block.previous') ? 'previous' : ''}
      `;

      fields = fields.replace(this.emptyLinesRegex, '').trim();
      if (!fields.length) {
        fields = `
        id
        timestamp
        height
        previous`;
      }
    }

    if (this.reqType === 'transactions' || this.reqType === 'blocks') {
      fields = `
      pageInfo {
        hasNextPage
      }
      edges { 
        cursor
        node { 
          ${fields}
        } 
      }`;
    }

    if (!this.reqType || !params) {
      throw new Error('Invalid options. You need to first set your options!');
    }

    return `query {
      ${this.reqType}(
        ${params}
      ){
        ${fields}
      }
    }`;
  }

  private log(str: string) {
    if (this.logs === 1 || (this.logs === 2 && this.arweave.getConfig().api.logging)) {
      console.log(str);
    }
  }

  private validateIncludes() {
    // Add all children if all of them are missing but a parent is present.
    if (this.includes.has('owner') && !this.includes.has('owner.address') && !this.includes.has('owner.key')) {
      this.includes.add('owner.address');
      this.includes.add('owner.key');
    } else if (this.includes.has('fee') && !this.includes.has('fee.winston') && !this.includes.has('fee.ar')) {
      this.includes.add('fee.winston');
      this.includes.add('fee.ar');
    } else if (
      this.includes.has('quantity') &&
      !this.includes.has('quantity.winston') &&
      !this.includes.has('quantity.ar')
    ) {
      this.includes.add('quantity.winston');
      this.includes.add('quantity.ar');
    } else if (this.includes.has('data') && !this.includes.has('data.size') && !this.includes.has('data.type')) {
      this.includes.add('data.size');
      this.includes.add('data.type');
    } else if (this.includes.has('tags') && !this.includes.has('tags.name') && !this.includes.has('tags.value')) {
      this.includes.add('tags.name');
      this.includes.add('tags.value');
    } else if (
      this.includes.has('block') &&
      !this.includes.has('block.timestamp') &&
      !this.includes.has('block.height') &&
      !this.includes.has('block.previous')
    ) {
      this.includes.add('block.id');
      this.includes.add('block.timestamp');
      this.includes.add('block.height');
      this.includes.add('block.previous');
    }

    // Add a parent if one of the children is present but the parent is not
    if (!this.includes.has('owner') && (this.includes.has('owner.address') || this.includes.has('owner.key'))) {
      this.includes.add('owner');
    } else if (!this.includes.has('fee') && (this.includes.has('fee.winston') || this.includes.has('fee.ar'))) {
      this.includes.add('fee');
    } else if (
      !this.includes.has('quantity') &&
      (this.includes.has('quantity.winston') || this.includes.has('quantity.ar'))
    ) {
      this.includes.add('quantity');
    } else if (!this.includes.has('data') && (this.includes.has('data.size') || this.includes.has('data.type'))) {
      this.includes.add('data');
    } else if (!this.includes.has('tags') && (this.includes.has('tags.name') || this.includes.has('tags.value'))) {
      this.includes.add('tags');
    } else if (
      !this.includes.has('block') &&
      (this.includes.has('block.timestamp') || this.includes.has('block.height') || this.includes.has('block.previous'))
    ) {
      this.includes.add('block');
    }
  }
}
