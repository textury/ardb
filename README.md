# ArDB

The best way to interact with the weave, without having to write any GQL and trying to remember param names!

ArDB is well typed and with the basic functions anyone will need to run and execute any request.

Plus, coming soon, we are planing to release an easy way to add or update data to Arwaeve right from ArDB!

#### Let's get coding!
First you'll need to add ardb to your project:
```
yarn add ardb
```

Import it into your project file:
```js 
import ArDB from 'ardb';
const ardb = new ArDB(arweaveInstance, logLevel? = LOG.ARWEAVE); // logLevel is optional and respects Arweave's logging by default.
```

Initialisation
```js
// arweave is Arweave Client instance
const ardb = new ArDB(arweave);
```
And now we are ready to play with it!

Examples:

```js
// Get a single transaction
const tx = await ardb.search('transaction').id('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY').findOne();

// Get an array of transactions, in this case it will be of length 1 since
// we asked to find only 1.
const txs = await ardb.search('transactions').appName('SmartWeaveAction').findOne();

// This is the same as doing:
const txs = await ardb.search('transactions').tag('App-Name', 'SmartWeaveAction').limit(1).find();

// Search for multiple transactions
const txs = await ardb.search('transactions').from('BPr7vrFduuQqqVMu_tftxsScTKUq9ke0rx4q5C9ieQU').find();

// You can then keep going and searching for more by doing:
const newTxs = await ardb.next();

// Or you could get everything at once by doing:
const txs = await ardb.search('blocks').id('BkJ_h-GGIwfek-cJd-RaJrOXezAc0PmklItzzCLIF_aSk36FEjpOBuBDS27D2K_T').findAll();
```

## API
```js
search(type: 'transaction' | 'transactions' | 'block' | 'blocks' = 'transactions')
```
- Every time we want to do a new request, que have to call `search()` before any other method.
- Default is `transactions`.

```js
id(id: string)
ids(ids: string[])
```
- Get transactions and blocks by ids. 
- If the search is of type `block` or `transaction`, and you set `ids(['TXID'])`, the first ID in the array will be selected as the search value.

```js
appName(name: string)
```
- Search by the default `App-Name` tag and set it's value to `name`.
- Same as using: `tag('App-Name', name)` or `find({tags: [{name: 'App-Name', values: [name]}]})` but much shorter.

```js
type(type: string)
```
- Search by the default `Content-Type` tag and set it's value to `type`.

```js
tags(tags: {name: string, values: string|string[]})
```
- Search by custom tags, example: `tags([{name: 'app', values: ['myval']}, {name: 'date', values: ['yesterday', 'today']}])`.

```js
tag(name: string, values: string|string[])
```
- Do a search with a single tag, example: `tag('app', 'myval')` or `tag('date', ['yesterday', 'today'])`.

```js
from(owners: string|string[])
```
- Search by using the deployer's wallet address. Can be either a string or an array of owners (string).

```js
to(recipients: string|string[])
```
- Search by using one (string), or a list (array of strings), of recipients.

```js
min(min: number)
max(max: number)
```
- Find transactions within a given block height range.

```js
only(fields: string|string[])
```
- Only return the specified return fields from your GQL query.

```js
exclude(fields: string|string[])
```
- Excludes the specified return fields from your GQL query.

```js
limit(limit: number)
```
- Limit the search to the `limit`. Default is `10`.
- *Note: Arweave's GQL doesn't return a list bigger than 100 items at once.*

```js
sort(sort: 'HEIGHT_DESC' | 'HEIGHT_ASC')
```
- Sort the results by either `desc` or `asc` based on the block height.
- Default is `HEIGHT_DESC`.

```js
cursor(cursor: string)
```
- If you need to retrieve `transactions` or `blocks` at a certain cursor, you can use the `cursor()` method to set it before doing the request.

## Finding
After we complete our request with the previous methods, we can go ahead and find the items.

```js
findOne(options: GlobalOptions = {})
```
 - Returns one item. For `transactions` and `blocks` it set the limit to `1` automatically, even if a `limit()` is set.

 ```js
 find(options: GlobalOptions = {})
 ```
 - Returns an array of items based on their `limit()`, if not set, limit is at the default `10`.

 ```js
 findAll(options: GlobalOptions = {})
 ```
 - Returns all the items, no mather the limit.

 ```js
 next()
 ```
 - Returns the next batch of items. If used after `find()` it returns one item. Else, it returns an array of items.

 ```js
 run(query: string)
 ```
 - Manually run a GQL query string.

 ```js
 runAll(query: string)
 ```
 - Manually run and return all from a GQL query string.

 ## Type declarations
 ```ts
 export interface IBlock {
  id?: string;
  timestamp?: number;
  height?: number;
  previous?: string;
}

export interface IBlockFilter {
  min?: number;
  max?: number;
}

export interface ITransactionOptions {
  id?: string;
}

export interface ITransactionsOptions {
  ids?: string[];
  owners?: string[];
  recipients?: string[];
  tags?: { name: string; values: string[] }[];
  block?: IBlockFilter;
  first?: number;
  after?: string;
  sort?: 'HEIGHT_DESC' | 'HEIGHT_ASC';
}

export interface IBlockOptions {
  id?: string;
}

export interface IBlocksOptions {
  id?: string;
  height?: IBlockFilter;
  after?: string;
  sort?: 'HEIGHT_DESC' | 'HEIGHT_ASC';
}

export interface IGlobalOptions extends ITransactionOptions, ITransactionsOptions, IBlockOptions, IBlocksOptions {}

export type AmountType = string | { winston?: string; ar?: string }; // string = ar
export type OwnerType = string | { address?: string; key?: string }; // string = address
export type DataType = string | { size: string; type: string }; // string = type
export type RequestType = 'transaction' | 'block' | 'transactions' | 'blocks';
```