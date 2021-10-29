# ArDB

The best way to interact with the weave, without having to write any GQL and trying to remember param names!

ArDB is well typed and with the basic functions anyone will need to use arweave as a database.

#### Let's get coding!

First you'll need to add ardb to your project:

```bash
yarn add ardb
# OR
npm i ardb
```

Import it into your project file:

```ts
import Schema from 'ardb';
```

Initialisation/Create a schema

```ts
interface ICharacter {
  age: number;
  firstName: string;
  lastName: string;
  father?: string;
  desc?: string;
}

// blockweave can be an Arweave/Blockweave Client instance
const blockweave = new Blockweave({ url: 'http://localhost:1984' });
const key = await blockweave.wallets.generate();
Character = new Schema<ICharacter>(
  {
    age: 'number',
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    father: { type: 'string', required: false },
    desc: { type: 'string', required: false, indexed: false },
  },
  blockweave,
  key
);
```

And now we are ready to play with it!

Examples:

```js
// Create a ducument
const luck = await Character.create({
  age: 100,
  firstName: 'luck',
  lastName: 'skywalker',
});

// Get a document by id
const sky = await Character.findById(luck._id);

// Get a document using a filter
const sky = await Character.findOne({ firstName: 'luck' });

// Get many documents using a filter
const skywalkers = await Character.findMany({ lastName: 'skywalker' });

// Get a document's history
const skywalkers = await Character.history(luck._id);

// Update a document by id
const sky = await Character.updateById(luck._id, {
  age: 99,
  firstName: 'luck',
  lastName: 'skywalker',
  father: 'Anakin Skywalker',
});

// Update a document using a filter
const sky = await Character.updateOne(
  { firstName: 'luck' },
  {
    age: 99,
    firstName: 'luck',
    lastName: 'skywalker',
    father: 'Anakin Skywalker',
  }
);

// Update many documents using a filter
const skywalkers = await Character.updateMany(
  { lastName: 'skywalker' },
  {
    age: 99,
    firstName: 'luck',
    lastName: 'skywalker',
    father: 'Anakin Skywalker',
  }
);

// Use notIndexData
const yoda = await Character.create({
  age: 900,
  firstName: 'yoda',
  lastName: 'jedi',
  desc: 'Do or do not. There is no try.',
});
const sky = await Character.findById(yoda._id);
// sky.desc is undefined since it's notIndexed

// to get desc you need
await Character.getData(sky);
// sky.desc is "Do or do not. There is no try."

// or
const sky2 = await Character.findById(yoda._id, { getData: true });
// sky2.desc is "Do or do not. There is no try."
```

## API

```js
search((type: 'transaction' | 'transactions' | 'block' | 'blocks' = 'transactions'));
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
- _Note: Arweave's GQL doesn't return a list bigger than 100 items at once._

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
findOne((options: GlobalOptions = {}));
```

- Returns one item. For `transactions` and `blocks` it set the limit to `1` automatically, even if a `limit()` is set.

```js
find((options: GlobalOptions = {}));
```

- Returns an array of items based on their `limit()`, if not set, limit is at the default `10`.

```js
findAll((options: GlobalOptions = {}));
```

- Returns all the items, no mather the limit.

```js
next();
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
