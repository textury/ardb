import Arweave from 'arweave';
import Blockweave from 'blockweave';
import { fieldType } from './faces/fields';
import GQLResultInterface, { GQLEdgeBlockInterface, GQLEdgeTransactionInterface } from './faces/gql';
import { IGlobalOptions, RequestType } from './faces/options';
import ArdbTransaction from './models/transaction';
import { Log, log, LOGS } from './utils/log';

/**
 * Arweave as a database.
 * To easily interact with Arweave's graphql endpoint.
 */
export class Query {
  private arweave: Arweave | Blockweave;
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
  constructor(arweave: Arweave | Blockweave, logLevel: LOGS = LOGS.ARWEAVE) {
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
   * Get transaction(s) by a list of tags
   * @param tags Array of objects with name (string) and values (array|string)
   * @returns ardb
   */
  tags(tags: { name: string; value: string[] | string }[]): Query {
    this.options = {};
    this.after = '';
    const ts: { name: string; values: string[] }[] = [];

    for (const tag of tags) {
      const values: string[] = typeof tag.value === 'string' ? [tag.value] : tag.value;
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
  tag(name: string, values: string | string[]): Query {
    this.options = {};
    this.after = '';
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
   * Set a cursor for when to get started.
   * @param after The cursor string.
   * @returns ardb
   */
  cursor(after: string): Query {
    this.options.after = after;

    return this;
  }

  /**
   * Find a single
   * @param filters
   * @returns
   */
  async findOne(filters: IGlobalOptions = {}): Promise<ArdbTransaction> {
    for (const filter of Object.keys(filters)) {
      this.options[filter] = filters[filter];
    }
    this.options.first = 1;

    const query = this.construct();
    const txs = await this.run(query);
    return txs.length ? txs[0] : null;
  }

  async findAll(filters: IGlobalOptions = {}): Promise<ArdbTransaction[]> {
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
  async next(): Promise<ArdbTransaction | ArdbTransaction[]> {
    if (!this.after || !this.after.length) {
      log.show('next(): Nothing more to search.');
      return;
    }

    const query = this.construct().replace(this.afterRegex, `after: "${this.after}"`);
    const result = await this.run(query);

    return this.options.first === 1 ? (result.length ? result[0] : null) : result;
  }

  async run(query: string): Promise<ArdbTransaction[]> {
    log.show('Running query:');
    log.show(query);

    const res: GQLResultInterface = await this.get(query);

    if (!res) return [];

    const edges = res.transactions.edges;
    if (edges && edges.length) {
      this.after = edges[edges.length - 1].cursor;
    } else {
      this.after = '';
    }
    return edges.map((edge) => new ArdbTransaction(edge.node));
  }

  async runAll(query: string): Promise<ArdbTransaction[]> {
    let hasNextPage: boolean = true;
    let edges: (GQLEdgeTransactionInterface | GQLEdgeBlockInterface)[] = [];
    let cursor = this.options.after || '';

    while (hasNextPage) {
      log.show('Running query:');
      log.show(query);

      const res: GQLResultInterface = await this.get(query);

      if (!res) {
        return [];
      }

      const r = res.transactions;
      if (r.edges && r.edges.length) {
        edges = edges.concat(r.edges);
        cursor = r.edges[r.edges.length - 1].cursor;
        query = query.replace(this.afterRegex, `after: "${cursor}"`);
      }
      hasNextPage = r.pageInfo.hasNextPage;
    }

    return edges.map((edge) => new ArdbTransaction(edge.node));
  }

  private async get(query: string): Promise<GQLResultInterface> {
    const res = await this.arweave.api.post('graphql', { query }, { headers: { 'content-type': 'application/json' } });
    log.show('Returned result: ');
    log.show(res.data.data);
    return res.data.data;
  }

  private construct(): string {
    this.reqType = 'transactions';
    delete this.options.id;
    delete this.options.height;

    if (!this.options.after) {
      this.options.after = '';
    }

    let params: string = JSON.stringify(this.options, null, 2)
      .replace(/"([^"]+)":/gm, '$1: ')
      .replace('"HEIGHT_DESC"', 'HEIGHT_DESC')
      .replace('"HEIGHT_ASC"', 'HEIGHT_ASC');
    params = params.substring(1, params.length - 1);

    let fields: string = '';

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

    if (!params) {
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
}
