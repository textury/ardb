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
import Schema, { registerSchema } from 'ardb';
```

Create and register a schema :

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
const Character = new Schema<ICharacter>(
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
registerSchema('Character', Character);

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
Reference Based Relationships (one-to-one) :
```ts
interface ICharacter {
    age: number;
    firstName: string;
    lastName: string;
    saber?: any;
  }
interface ILightsaber {
    color: string;
    power: number;
  }
const Character = new Schema<ICharacter>(
      {
        age: 'number',
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        saber: { type: 'string', required: false, ref: 'Lightsaber' },
      },
      blockweave,
      key
    );
registerSchema('Character', Character);
const Lightsaber = new Schema<ILightsaber>(
      {
        color: 'string',
        power: 'number'
      },
      blockweave,
      key
    );
registerSchema('Lightsaber', Lightsaber);

const saber = await Lightsaber.create({
      power: 110,
      color: 'red',
    });

const luck = await Character.updateById(luck._id, {
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
      saber: saber._id,
    });

const sky = await Character.findById(luck._id);
//sky.saber is an id
await Character.populate(sky);
//sky.saber is an object with all saber data
```
one-to-many
```ts
interface ICharacter {
    age: number;
    firstName: string;
    lastName: string;
    saber?: any;
  }
interface ILightsaber {
    color: string;
    power: number;
  }
const Character = new Schema<ICharacter>(
      {
        age: 'number',
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        saber: { type: 'string[]', required: false, ref: 'Lightsaber' },
      },
      blockweave,
      key
    );
registerSchema('Character', Character);

const Lightsaber = new Schema<ILightsaber>(
      {
        color: 'string',
        power: 'number'
      },
      blockweave,
      key
    );
registerSchema('Lightsaber', Lightsaber);

const saber1 = await Lightsaber.create({
      character: luck._id,
      power: 110,
      color: 'red',
    });
const saber2 = await Lightsaber.create({
      character: luck._id,
      power: 100,
      color: 'blue',
    });
const saber3 = await Lightsaber.create({
      character: luck._id,
      power: 120,
      color: 'green',
    });
const saber4 = await Lightsaber.create({
      character: luck._id,
      power: 130,
      color: 'yellow',
    });

const luck = await Character.updateById(luck._id, {
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
      saber: [saber1._id, saber2._id, saber3._id, saber4._id],
    });

const sky = await Character.findById(luck._id);
//sky.saber is an array id
await Character.populate(sky);
//sky.saber is an array of object that contains saber1, saber2, saber3 and saber4
```
## API

```ts
Schema<T>(
      schema,
      blockweave,
      key
    )
```
Creation
```ts
Schema.create(data: T):Promise<Document & T>
```
Find
```ts
Schema.findById(id: string, opt = { getData: false }): Promise<Document & T>
```
```ts
Schema.findOne(filter: QueryDocumentDTO & { [P in keyof T]?: T[P] }, opt = { getData: false }): Promise<Document & T>
```
```ts
Schema.findMany(
    filter: QueryDocumentDTO & { [P in keyof T]?: T[P] },
    opt = { getData: false }
  ): Promise<Document[] & T[]>
```
```ts
Schema.history(id: string, opt = { getData: false }): Promise<Document[] & T[]>
```
Update
```ts
Schema.updateById(id: string, update: T): Promise<Document & T>
```
```ts
Schema.updateOne(filter: QueryDocumentDTO & { [P in keyof T]?: T[P] }, update: T): Promise<Document & T>
```
```ts
Schema.updateMany(filter: QueryDocumentDTO & { [P in keyof T]?: T[P] }, update: T): Promise<Document[] & T[]>
```
Get data from not indexed data
```ts
Schema.getData(document: Document & T): Promise<void>
```
Populate (Join) the documents
```ts
Schema.populate(document: Document & T)
```
## Type declarations

```ts
interface Document {
  _id?: string;
  _txId?: string;
  _v?: number;
  _createdAt?: Date;
  _minedAt?: Date;
  notIndexedData?: string;
}

interface QueryDocumentDTO {
  _id?: string;
  _createdAt?: Date;
  _minedAt?: Date;
}
```
