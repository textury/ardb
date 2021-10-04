import Blockweave from 'blockweave';
import ArDB from '../ardb';
import { Schema } from '../schema';
describe('', () => {
  let blockweave;
  let ardb;
  let key;
  let Character;
  beforeAll(async () => {
    blockweave = new Blockweave({ url: 'http://localhost:1984' });

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
});
