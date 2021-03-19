import Arweave from 'arweave';
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
  private afterRegex = /after: *"([^"]*)"/gi;

  /**
   *
   * @param arweave An arweave instance
   * @param logs Show logs. 0 = false, 1 = true, 2 = if arweave instance has log enabled.
   */
  constructor(arweave: Arweave, logs: number = 2) {
    this.arweave = arweave;
    this.logs = logs;
  }

  /**
   * Search is the first function called before doing a find.
   * @param col What type of search are we going to do.
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
    const res = await this.arweave.api.post('/graphql', { query }, { headers: { 'content-type': 'application/json' } });
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

    let returnParams: string = '';
    switch (this.reqType) {
      case 'transaction':
        returnParams = `
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
            name,
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
        break;

      case 'transactions':
        returnParams = `
          pageInfo {
            hasNextPage
          }
          edges { 
            cursor
            node { 
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
              }
            } 
          }`;
        break;

      case 'block':
        returnParams = `
          id
          timestamp
          height
          previous`;
        break;

      case 'blocks':
        returnParams = `
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node {
              id
              timestamp
              height
              previous
            }
          }`;
        break;
    }

    if (!this.reqType || !params) {
      throw new Error('Invalid options. You need to first set your options!');
    }

    return `query {
      ${this.reqType}(
        ${params}
      ){
        ${returnParams}
      }
    }`;
  }

  private log(str: string) {
    if (this.logs === 1 || (this.logs === 2 && this.arweave.getConfig().api.logging)) {
      console.log(str);
    }
  }
}
