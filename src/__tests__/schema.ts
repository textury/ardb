import Blockweave from 'blockweave';
import ArDB from '../ardb';
import Arlocal from 'arlocal';
import { Schema } from '../schema';
describe('', () => {
  let blockweave;
  let ardb;
  let key;
  let Character;
  let arlocal;
  beforeAll(async () => {
    blockweave = new Blockweave({ url: 'http://localhost:1984' });
    arlocal = new Arlocal();
    await arlocal.start();
    // @ts-ignore
    ardb = new ArDB(blockweave);
    key = await blockweave.wallets.generate();
    Character = new Schema(
      {
        age: 'number',
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        father: { type: 'string', required: false },
      },
      blockweave,
      key,
      ardb
    );
  });
  afterAll(async () => {
    await arlocal.stop();
  });
  it('Create a "document"', async () => {
    const luck = await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
    });
    expect(luck.age).toEqual(100);
    expect(luck.firstName).toEqual('luck');
    expect(luck.lastName).toEqual('Skywalker');
  });
  it('Get a "document"', async () => {
    const luck = await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
    });
    const sky = await Character.findById(luck._id);
    expect(luck._id).toEqual(sky._id);
    expect(luck.firstName).toEqual(sky.firstName);
    expect(luck.lastName).toEqual(sky.lastName);
    expect(luck.age).toEqual(sky.age);
  });
  it('Update a "document"', async () => {
    const luck = await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
    });
    let newLuck = await Character.updateById(luck._id, {
      age: 99,
      firstName: 'luck',
      lastName: 'skywalker',
      father: 'Anakin Skywalker',
    });
    let sky = await Character.findById(luck._id);
    expect(newLuck._id).toEqual(sky._id);
    expect(newLuck.firstName).toEqual(sky.firstName);
    expect(newLuck.lastName).toEqual(sky.lastName);
    expect(newLuck.father).toEqual(sky.father);
    expect(newLuck.age).toEqual(sky.age);
    expect(newLuck._v).toEqual(2);
    newLuck = await Character.updateById(luck._id, {
      age: 98,
      firstName: 'luck',
      lastName: 'skywalker',
    });
    sky = await Character.findById(luck._id);
    expect(newLuck._id).toEqual(sky._id);
    expect(newLuck.firstName).toEqual(sky.firstName);
    expect(newLuck.lastName).toEqual(sky.lastName);
    expect(newLuck.father).toBeUndefined();
    expect(newLuck.age).toEqual(sky.age);
    expect(newLuck._v).toEqual(3);
  });
  it('Get a "document" from filter using age', async () => {
    const luck = await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
    });
    const sky = await Character.findOne({ age: 100 });
    expect(luck._id).toEqual(sky._id);
    expect(luck.firstName).toEqual(sky.firstName);
    expect(luck.lastName).toEqual(sky.lastName);
    expect(luck.father).toBeUndefined();
    expect(luck.age).toEqual(sky.age);
    expect(luck._v).toEqual(1);
  });
  it('Get a "document" from filter using age and firstName', async () => {
    const luck = await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
    });
    const sky = await Character.findOne({ age: 100, firstName: ['luck', 'something Else'] });
    expect(luck._id).toEqual(sky._id);
    expect(luck.firstName).toEqual(sky.firstName);
    expect(luck.lastName).toEqual(sky.lastName);
    expect(luck.father).toBeUndefined();
    expect(luck.age).toEqual(sky.age);
    expect(luck._v).toEqual(1);
  });
  it('returns undefined when not found', async () => {
    await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
    });
    const sky = await Character.findOne({ age: 2 });
    expect(sky).toBeUndefined();
  });
  it("returns undefined when it's not the last version", async () => {
    const luck = await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
    });
    let newLuck = await Character.updateById(luck._id, {
      age: 99,
      firstName: 'luck',
      lastName: 'skywalker',
      father: 'Anakin Skywalker',
    });
    let sky = await Character.findById(luck._id);
    expect(newLuck._id).toEqual(sky._id);
    expect(newLuck.firstName).toEqual(sky.firstName);
    expect(newLuck.lastName).toEqual(sky.lastName);
    expect(newLuck.father).toEqual(sky.father);
    expect(newLuck.age).toEqual(sky.age);
    expect(newLuck._v).toEqual(2);
    newLuck = await Character.updateById(luck._id, {
      age: 98,
      firstName: 'luck',
      lastName: 'skywalker',
    });
    sky = await Character.findOne({ age: 98 });
    expect(newLuck._id).toEqual(sky._id);
    expect(newLuck.firstName).toEqual(sky.firstName);
    expect(newLuck.lastName).toEqual(sky.lastName);
    expect(newLuck.father).toBeUndefined();
    expect(newLuck.age).toEqual(sky.age);
    expect(newLuck._v).toEqual(3);
    sky = await Character.findOne({ age: 100 });
    expect(sky).toBeUndefined();
    sky = await Character.findOne({ father: 'Anakin Skywalker' });
    expect(sky).toBeUndefined();
  });
  it('update a "document" with filter ', async () => {
    const luck = await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
    });
    let newLuck = await Character.updateOne(
      { age: 100 },
      {
        age: 99,
        firstName: 'luck',
        lastName: 'skywalker',
        father: 'Anakin Skywalker',
      }
    );
    const sky = await Character.findById(luck._id);
    expect(newLuck._id).toEqual(sky._id);
    expect(newLuck.firstName).toEqual(sky.firstName);
    expect(newLuck.lastName).toEqual(sky.lastName);
    expect(newLuck.father).toEqual(sky.father);
    expect(newLuck.age).toEqual(sky.age);
    expect(newLuck._v).toEqual(2);

    newLuck = await Character.updateOne(
      { age: 100 },
      {
        age: 99,
        firstName: 'luck',
        lastName: 'skywalker',
        father: 'Anakin Skywalker',
      }
    );
    expect(newLuck).toBeUndefined();
  });

  it('returns many', async () => {
    const luck = await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'SKywalker',
    });
    const anakin = await Character.create({
      age: 153,
      firstName: 'anakin',
      lastName: 'SKywalker',
    });
    let skywalkers = await Character.findMany({ lastName: 'SKywalker' });
    expect(skywalkers[0].firstName).toEqual(anakin.firstName);
    expect(skywalkers[0].age).toEqual(anakin.age);
    expect(skywalkers[1].firstName).toEqual(luck.firstName);
    expect(skywalkers[1].age).toEqual(luck.age);

    await Character.updateOne(
      { age: 153 },
      {
        age: 153,
        firstName: 'anakin',
        lastName: 'vador',
      }
    );
    skywalkers = await Character.findMany({ lastName: 'SKywalker' });
    expect(skywalkers?.length).toEqual(1);
  });
});
