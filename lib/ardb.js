"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Arweave as a database.
 * To easily interact with Arweave's graphql endpoint.
 */
class ArDB {
    /**
     *
     * @param arweave An arweave instance
     * @param logs Show logs. 0 = false, 1 = true, 2 = if arweave instance has log enabled.
     */
    constructor(arweave, logs = 2) {
        this.options = {};
        this.logs = 2;
        this.after = '';
        this.afterRegex = /after: *"([^"]*)"/gi;
        this.arweave = arweave;
        this.logs = logs;
    }
    /**
     * Search is the first function called before doing a find.
     * @param col What type of search are we going to do.
     */
    search(type) {
        this.reqType = type;
        this.options = {};
        this.after = '';
        return this;
    }
    id(id) {
        this.checkSearchType();
        this.options.id = id;
        this.options.ids = [id];
        return this;
    }
    ids(ids) {
        this.checkSearchType();
        this.options.ids = ids;
        this.options.id = ids[0];
        return this;
    }
    appName(name) {
        this.checkSearchType();
        this.tag('App-Name', [name]);
        return this;
    }
    type(type) {
        this.checkSearchType();
        this.tag('Content-Type', [type]);
        return this;
    }
    tags(tags) {
        this.checkSearchType();
        this.options.tags = tags;
        return this;
    }
    tag(name, values) {
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
    from(owners) {
        this.checkSearchType();
        if (typeof owners === 'string') {
            owners = [owners];
        }
        this.options.owners = owners;
        return this;
    }
    to(recipients) {
        this.checkSearchType();
        if (typeof recipients === 'string') {
            recipients = [recipients];
        }
        this.options.recipients = recipients;
        return this;
    }
    limit(limit) {
        this.checkSearchType();
        if (limit < 1) {
            console.warn('Limit cannot be less than 1, setting it to 1.');
            limit = 1;
        }
        else if (limit > 100) {
            console.warn("Arweave GQL won't return more than 100 entries at once.");
        }
        this.options.first = limit;
        return this;
    }
    sort(sort) {
        this.options.sort = sort;
        return this;
    }
    cursor(after) {
        this.checkSearchType();
        this.options.after = after;
        return this;
    }
    /** Ready to run **/
    find(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            this.checkSearchType();
            for (const filter in filters) {
                this.options[filter] = filters[filter];
            }
            if (!this.options.first) {
                this.options.first = 10;
            }
            const query = this.construct();
            return this.run(query);
        });
    }
    findOne(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            this.checkSearchType();
            for (const filter in filters) {
                this.options[filter] = filters[filter];
            }
            this.options.first = 1;
            const query = this.construct();
            return this.run(query);
        });
    }
    findAll(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            this.checkSearchType();
            for (const filter in filters) {
                this.options[filter] = filters[filter];
            }
            this.options.first = 100;
            const query = this.construct();
            return this.runAll(query);
        });
    }
    /**
     * To run with the cursor
     */
    next() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.after || !this.after.length) {
                console.warn('next(): Nothing more to search.');
                return;
            }
            const query = this.construct().replace(this.afterRegex, `after: "${this.after}"`);
            return this.run(query);
        });
    }
    run(query) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log('Running query:');
            this.log(query);
            const res = yield this.get(query);
            if (res.transaction) {
                return res.transaction;
            }
            else if (res.block) {
                return res.block;
            }
            else if (res.transactions) {
                const edges = res.transactions.edges;
                this.after = edges[edges.length - 1].cursor;
                return edges;
            }
            else if (res.blocks) {
                const edges = res.blocks.edges;
                this.after = edges[edges.length - 1].cursor;
                return edges;
            }
        });
    }
    runAll(query) {
        return __awaiter(this, void 0, void 0, function* () {
            let hasNextPage = true;
            let edges = [];
            let cursor = this.options.after || '';
            while (hasNextPage) {
                const res = yield this.get(query);
                if (res.transaction) {
                    return res.transaction;
                }
                else if (res.block) {
                    return res.block;
                }
                else if (res.transactions) {
                    const r = res.transactions;
                    if (r.edges && r.edges.length) {
                        edges = edges.concat(r.edges);
                        cursor = r.edges[r.edges.length - 1].cursor;
                        query = query.replace(this.afterRegex, `after: "${cursor}"`);
                    }
                    hasNextPage = r.pageInfo.hasNextPage;
                }
                else if (res.blocks) {
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
        });
    }
    /** Helpers */
    checkSearchType() {
        if (!this.reqType ||
            (this.reqType !== 'transaction' &&
                this.reqType !== 'block' &&
                this.reqType !== 'transactions' &&
                this.reqType !== 'blocks')) {
            throw new Error('Invalid search type. Must provide one and it must be either "transaction", "transactions", "block" or "blocks"');
        }
    }
    get(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.arweave.api.post('/graphql', { query }, { headers: { 'content-type': 'application/json' } });
            this.log('Returned result: ');
            this.log(res.data.data);
            return res.data.data;
        });
    }
    construct() {
        if (this.reqType === 'transactions' || this.reqType === 'blocks') {
            delete this.options.id;
            if (this.reqType === 'transactions') {
                delete this.options.height;
            }
            else {
                delete this.options.owners;
                delete this.options.recipients;
                delete this.options.tags;
                delete this.options.block;
            }
            if (!this.options.after) {
                this.options.after = '';
            }
        }
        else {
            this.options = { id: this.options.id };
        }
        let params = JSON.stringify(this.options, null, 2).replace(/"([^"]+)":/gm, '$1: ');
        params = params.substring(1, params.length - 1);
        let returnParams = '';
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
    log(str) {
        if (this.logs === 1 ||
            (this.logs === 2 && this.arweave.getConfig().api.logging)) {
            console.log(str);
        }
    }
}
exports.default = ArDB;
