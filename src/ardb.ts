import Arweave from 'arweave';
import { fieldType } from './faces/fields';
import GQLResultInterface, { GQLEdgeBlockInterface, GQLEdgeTransactionInterface } from './faces/gql';
import { IGlobalOptions, RequestType } from './faces/options';
import { Block } from './models/block';
import { Transaction } from './models/transaction';
import { Log, log, LOGS } from './utils/log';

/**
 * Arweave as a database.
 * To easily interact with Arweave's graphql endpoint.
 */
export default class ArDB {
  private arweave: Arweave;
  private reqType: RequestType = 'transactions';
  private options: IGlobalOptions = {};
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

  private log: Log;

  /**
   *
   * @param arweave An arweave instance
   * @param logLevel Show logs. 0 = false, 1 = true, 2 = if arweave instance has log enabled.
   */
  constructor(arweave: Arweave, logLevel: LOGS = LOGS.ARWEAVE) {
    this.arweave = arweave;
    log.init(logLevel, arweave);

    this.includes = new Set(this.fields);
  }

  /**
   * Get the current cursor (also known as `after`) in case you need to do extra manual work with it.
   * @returns cursor
   */
  getCursor(): string {
    return this.after;
  }

  /**
   * Search is the first function called before doing a find.
   * @param type What type of search are we going to do.
   * @returns ardb
   */
  search(type: RequestType = 'transactions'): ArDB {
    this.reqType = type;

    this.options = {};
    this.after = '';

    return this;
  }

  /**
   * Get transactions or blocks by transaction ID.
   * @param id The transaction/block ID.
   * @returns ardb
   */
  id(id: string): ArDB {
    this.checkSearchType();
    this.options.id = id;
    this.options.ids = [id];

    return this;
  }

  /**
   * Get transactions or blocks by transaction IDs.
   * @param ids A list of transactions/blocks IDs.
   * @returns ardb
   */
  ids(ids: string[]): ArDB {
    this.checkSearchType();
    this.options.ids = ids;
    this.options.id = ids[0];

    return this;
  }

  /**
   * Get transaction(s) per tag App-Name = name.
   * @param name The App-Name value as string.
   * @returns ardb
   */
  appName(name: string): ArDB {
    this.checkSearchType();
    this.tag('App-Name', [name]);

    return this;
  }

  /**
   * Get transaction(s) with the tag Content-Type = type.
   * @param type Content-Type as string.
   * @returns ardb
   */
  type(type: string): ArDB {
    this.checkSearchType();
    this.tag('Content-Type', [type]);

    return this;
  }

  /**
   * Get transaction(s) by a list of tags
   * @param tags Array of objects with name (string) and values (array|string)
   * @returns ardb
   */
  tags(tags: { name: string; values: string[] | string }[]): ArDB {
    this.checkSearchType();

    const ts: { name: string; values: string[] }[] = [];

    for (const tag of tags) {
      const values: string[] = typeof tag.values === 'string' ? [tag.values] : tag.values;
      ts.push({
        name: tag.name,
        values,
      });
    }

    this.options.tags = ts;
    return this;
  }

  /**
   * Get transaction(s) by this specific tag, if previous ones exists it will be added to the list of tags.
   * @param name The tag name, ex: App-Name.
   * @param values The tag value or an array of values.
   * @returns ardb
   */
  tag(name: string, values: string | string[]): ArDB {
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

  /**
   * Get transaction(s) by owner(s).
   * @param owners Owner address or a list of owners.
   * @returns ardb
   */
  from(owners: string | string[]): ArDB {
    this.checkSearchType();

    if (typeof owners === 'string') {
      owners = [owners];
    }
    this.options.owners = owners;

    return this;
  }

  /**
   * Get transaction(s) by recipient(s).
   * @param recipients A recipient address or a list of recipients.
   * @returns ardb
   */
  to(recipients: string | string[]): ArDB {
    this.checkSearchType();

    if (typeof recipients === 'string') {
      recipients = [recipients];
    }
    this.options.recipients = recipients;

    return this;
  }

  /**
   * Get blocks with the min height.
   * @param min The minimum height for the search.
   * @returns ardb
   */
  min(min: number): ArDB {
    this.checkSearchType();

    if (!this.options.block) {
      this.options.block = {};
    }
    this.options.block.min = min;

    return this;
  }

  /**
   * Get blocks by a max height.
   * @param max The maximum height for the search.
   * @returns ardb
   */
  max(max: number): ArDB {
    this.checkSearchType();

    if (!this.options.block) {
      this.options.block = {};
    }
    this.options.block.max = max;

    return this;
  }

  /**
   * Limits the returned results, this only works with `find()`, `findOne()` will always have a limit of 1, and `findAll()` has no limit.
   * @param limit A number between 1 and 100.
   * @returns ardb
   */
  limit(limit: number): ArDB {
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

  /**
   * Sort blocks or transactions by DESC or ASC.
   * @param sort HEIGHT_DESC or HEIGHT_ASC.
   * @returns ardb
   */
  sort(sort: 'HEIGHT_DESC' | 'HEIGHT_ASC'): ArDB {
    this.options.sort = sort;

    return this;
  }

  /**
   * Set a cursor for when to get started.
   * @param after The cursor string.
   * @returns ardb
   */
  cursor(after: string): ArDB {
    this.checkSearchType();
    this.options.after = after;

    return this;
  }

  /**
   * Returns only the specified fields for block(s) or transaction(s).
   * @param fields The field or list of fields to return.
   * @returns ardb
   */
  only(fields: fieldType | fieldType[]): ArDB {
    // Empty the included fields.
    this.includes = new Set();

    if (typeof fields === 'string' && this.fields.indexOf(fields) !== -1) {
      this.includes.add(fields);
      this.validateIncludes();

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

  /**
   * Exclude fields from the returned results.
   * @param fields A field or list of fields to exclude.
   * @returns ardb
   */
  exclude(fields: fieldType | fieldType[]): ArDB {
    // To make only() and exclude() work the same, re-add all fields to includes.
    this.includes = new Set(this.fields);

    if (typeof fields === 'string') {
      this.includes.delete(fields);
      this.validateIncludes();
      return this;
    }

    for (const field of fields) {
      this.includes.delete(field);
    }

    this.validateIncludes();
    return this;
  }

  // Ready to run

  /**
   * Find a list of blocks or transactions based on the specified search filters.
   * @param filters Optional. You can manually add the filters here instead of using our search methods.
   * @returns A list of transactions or blocks.
   */
  async find(filters: IGlobalOptions = {}): Promise<Transaction[] | Block[]> {
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

  /**
   * Find a single
   * @param filters
   * @returns
   */
  async findOne(filters: IGlobalOptions = {}): Promise<Transaction | Block> {
    this.checkSearchType();

    for (const filter of Object.keys(filters)) {
      this.options[filter] = filters[filter];
    }
    this.options.first = 1;

    const query = this.construct();
    const txs = await this.run(query);
    return txs.length ? txs[0] : null;
  }

  async findAll(filters: IGlobalOptions = {}): Promise<Transaction[] | Block[]> {
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
  async next(): Promise<Transaction | Block | Transaction[] | Block[]> {
    if (!this.after || !this.after.length) {
      log.show('next(): Nothing more to search.');
      return;
    }

    const query = this.construct().replace(this.afterRegex, `after: "${this.after}"`);
    const result = await this.run(query);

    return this.options.first === 1 ? (result.length ? result[0] : null) : result;
  }

  async run(query: string): Promise<Transaction[] | Block[]> {
    log.show('Running query:');
    log.show(query);

    const res: GQLResultInterface = await this.get(query);

    if (!res) return [];

    if (res.transaction) {
      return [new Transaction(res.transaction, this.arweave)];
    } else if (res.block) {
      return [new Block(res.block)];
    } else if (res.transactions) {
      const edges = res.transactions.edges;
      if (edges && edges.length) {
        this.after = edges[edges.length - 1].cursor;
      } else {
        this.after = '';
      }
      return edges.map((edge) => new Transaction(edge.node, this.arweave));
    } else if (res.blocks) {
      const edges = res.blocks.edges;
      if (edges && edges.length) {
        this.after = edges[edges.length - 1].cursor;
      } else {
        this.after = '';
      }
      return edges.map((edge) => new Block(edge.node));
    }
  }

  async runAll(query: string): Promise<Transaction[] | Block[]> {
    let hasNextPage: boolean = true;
    let edges: (GQLEdgeTransactionInterface | GQLEdgeBlockInterface)[] = [];
    let cursor = this.options.after || '';
    let isTx: boolean = true;

    while (hasNextPage) {
      log.show('Running query:');
      log.show(query);

      const res: GQLResultInterface = await this.get(query);

      if (!res) {
        return [];
      }

      if (res.transaction) {
        return [new Transaction(res.transaction, this.arweave)];
      } else if (res.block) {
        return [new Block(res.block)];
      } else if (res.transactions) {
        const r = res.transactions;
        if (r.edges && r.edges.length) {
          edges = edges.concat(r.edges);
          cursor = r.edges[r.edges.length - 1].cursor;
          query = query.replace(this.afterRegex, `after: "${cursor}"`);
        }
        hasNextPage = r.pageInfo.hasNextPage;
      } else if (res.blocks) {
        isTx = false;

        const r = res.blocks;
        if (r.edges && r.edges.length) {
          edges = edges.concat(r.edges);
          cursor = r.edges[r.edges.length - 1].cursor;
          query = query.replace(this.afterRegex, `after: "${cursor}"`);
        }
        hasNextPage = r.pageInfo.hasNextPage;
      }
    }

    if (isTx) {
      return edges.map((edge) => new Transaction(edge.node, this.arweave));
    } else {
      return edges.map((edge) => new Block(edge.node));
    }
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
    log.show('Returned result: ');
    log.show(res.data.data);
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

    let params: string = JSON.stringify(this.options, null, 2)
      .replace(/"([^"]+)":/gm, '$1: ')
      .replace('"HEIGHT_DESC"', 'HEIGHT_DESC')
      .replace('"HEIGHT_ASC"', 'HEIGHT_ASC');
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

  private validateIncludes() {
    // Add all children if all of them are missing but a parent is present.
    if (this.includes.has('owner') && !this.includes.has('owner.address') && !this.includes.has('owner.key')) {
      this.includes.add('owner.address');
      this.includes.add('owner.key');
    }

    if (this.includes.has('fee') && !this.includes.has('fee.winston') && !this.includes.has('fee.ar')) {
      this.includes.add('fee.winston');
      this.includes.add('fee.ar');
    }

    if (this.includes.has('quantity') && !this.includes.has('quantity.winston') && !this.includes.has('quantity.ar')) {
      this.includes.add('quantity.winston');
      this.includes.add('quantity.ar');
    }

    if (this.includes.has('data') && !this.includes.has('data.size') && !this.includes.has('data.type')) {
      this.includes.add('data.size');
      this.includes.add('data.type');
    }

    if (this.includes.has('tags') && !this.includes.has('tags.name') && !this.includes.has('tags.value')) {
      this.includes.add('tags.name');
      this.includes.add('tags.value');
    }

    if (
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
    }

    if (!this.includes.has('fee') && (this.includes.has('fee.winston') || this.includes.has('fee.ar'))) {
      this.includes.add('fee');
    }

    if (!this.includes.has('quantity') && (this.includes.has('quantity.winston') || this.includes.has('quantity.ar'))) {
      this.includes.add('quantity');
    }

    if (!this.includes.has('data') && (this.includes.has('data.size') || this.includes.has('data.type'))) {
      this.includes.add('data');
    }

    if (!this.includes.has('tags') && (this.includes.has('tags.name') || this.includes.has('tags.value'))) {
      this.includes.add('tags');
    }

    if (
      !this.includes.has('block') &&
      (this.includes.has('block.timestamp') || this.includes.has('block.height') || this.includes.has('block.previous'))
    ) {
      this.includes.add('block');
    }
  }
}
