import Blockweave from 'blockweave';
import Arlocal from 'arlocal';
import Schema, { registerSchema } from '../ardb';
import { Document } from '../faces/document';
describe('SCHEMA', () => {
  interface ICharacter {
    age: number;
    firstName: string;
    lastName: string;
    father?: string;
    desc?: string;
  }
  interface ILightsaber {
    color: string;
    power: number;
    character: Document & ICharacter;
  }
  let blockweave: Blockweave;
  let key;
  let Character: Schema<ICharacter>;
  let Lightsaber: Schema<ILightsaber>;
  let arlocal;
  let luck;
  beforeAll(async () => {
    blockweave = new Blockweave({ url: 'http://localhost:1984' });
    key = await blockweave.wallets.generate();
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
    registerSchema('Character', Character);
    Lightsaber = new Schema<ILightsaber>(
      {
        color: 'string',
        power: 'number',
        character: { type: 'string', ref: 'Character' },
      },
      blockweave,
      key
    );
    registerSchema('Lightsaber', Lightsaber);
  });
  beforeEach(async () => {
    arlocal = new Arlocal(1984, true, `${process.cwd()}/database/${Math.random().toPrecision(4)}`);
    await arlocal.start();

    luck = await Character.create({
      age: 100,
      firstName: 'luck',
      lastName: 'Skywalker',
    });
  });
  afterEach(async () => {
    await arlocal.stop();
  });
  it('Create a "document" without indexed data', async () => {
    expect(luck.age).toEqual(100);
    expect(luck.firstName).toEqual('luck');
    expect(luck.lastName).toEqual('Skywalker');
  });
  it('Get a "document" by id', async () => {
    const sky = await Character.findById(luck._id);
    expect(luck._id).toEqual(sky._id);
    expect(luck.firstName).toEqual(sky.firstName);
    expect(luck.lastName).toEqual(sky.lastName);
    expect(luck.age).toEqual(sky.age);
  });
  it('Update a "document"', async () => {
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
    const sky = await Character.findOne({ age: 100 });

    expect(luck._id).toEqual(sky._id);
    expect(luck.firstName).toEqual(sky.firstName);
    expect(luck.lastName).toEqual(sky.lastName);
    expect(luck.father).toBeUndefined();
    expect(luck.age).toEqual(sky.age);
    expect(luck._v).toEqual(1);
  });
  it('Get a "document" from filter using age and firstName', async () => {
    const sky = await Character.findOne({ age: 100, firstName: 'luck' });
    expect(luck._id).toEqual(sky._id);
    expect(luck.firstName).toEqual(sky.firstName);
    expect(luck.lastName).toEqual(sky.lastName);
    expect(luck.father).toBeUndefined();
    expect(luck.age).toEqual(sky.age);
    expect(luck._v).toEqual(1);
  });
  it('returns undefined when not found', async () => {
    const sky = await Character.findOne({ age: 2 });
    expect(sky).toBeUndefined();
  });
  it("returns undefined when it's not the last version", async () => {
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
  it('update a "document" with filter', async () => {
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
    expect(99).toEqual(sky.age);
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
    const obiWan = await Character.create({
      age: 136,
      firstName: 'Obi-Wan',
      lastName: 'Kenobi',
    });
    await Character.create({
      age: 136,
      firstName: 'Obi-Wan',
      lastName: 'Kenobi',
    });

    let skywalkers = await Character.findMany({ lastName: 'Kenobi' });
    expect(skywalkers).toHaveLength(2);
    expect(skywalkers[0].firstName).toEqual(obiWan.firstName);
    expect(skywalkers[0].age).toEqual(obiWan.age);
    expect(skywalkers[0]._v).toEqual(1);
    expect(skywalkers[1].firstName).toEqual(obiWan.firstName);
    expect(skywalkers[1].age).toEqual(obiWan.age);
    expect(skywalkers[1]._v).toEqual(1);

    await Character.updateOne(
      { firstName: 'Obi-Wan' },
      {
        age: 153,
        firstName: 'anakin',
        lastName: 'vador',
      }
    );
    await blockweave.api.get('mine');
    skywalkers = await Character.findMany({ lastName: 'Kenobi' });
    expect(skywalkers?.length).toEqual(1);
    expect(skywalkers[0].firstName).toEqual(obiWan.firstName);
    expect(skywalkers[0].lastName).toEqual(obiWan.lastName);
    expect(skywalkers[0].age).toEqual(obiWan.age);
  });

  it('Gets a document history', async () => {
    await Character.updateById(luck._id, {
      age: 99,
      firstName: 'luck',
      lastName: 'Skywalker',
      father: 'Anakin Skywalker',
    });

    await blockweave.api.get('mine');
    const history = await Character.history(luck._id);
    expect(history.length).toEqual(2);
    expect(history[0]._id).toEqual(history[1]._id);
    expect(history[0].firstName).toEqual(history[1].firstName);
    expect(history[0]._minedAt).toBeDefined();
  });
  it('Updates many', async () => {
    const shmi1 = await Character.create({
      age: 90,
      firstName: 'shmi',
      lastName: 'Skywalker',
    });

    const shmi2 = await Character.create({
      age: 68,
      firstName: 'shmi',
      lastName: 'Skywalker',
    });

    const lucks = await Character.updateMany(
      { firstName: 'shmi' },
      { age: 100, firstName: 'luck', lastName: 'Skywalker' }
    );
    expect(lucks.length).toEqual(2);
    expect(lucks[0].age).toEqual(100);
    expect(lucks[1].age).toEqual(100);
    expect(lucks[0].firstName).toEqual('luck');
    expect(lucks[1].firstName).toEqual('luck');
    const sky1 = await Character.findById(shmi1._id);
    const sky2 = await Character.findById(shmi2._id);
    expect(sky2.age).toEqual(100);
    expect(sky2.firstName).toEqual('luck');
    expect(sky1.age).toEqual(100);
    expect(sky1.firstName).toEqual('luck');
  });

  it('Updates 200', async () => {
    let i = 200;
    while (i--)
      await Character.create({
        age: 90,
        firstName: 'shmi',
        lastName: 'Skywalker',
      });

    const shmis = await Character.updateMany(
      { firstName: 'shmi' },
      { age: 500, firstName: 'shmi', lastName: 'Skywalker' }
    );
    expect(shmis.length).toEqual(200);
    const res = await Character.findMany({ age: 500 });
    expect(res).toHaveLength(200);
  });

  it('Creates a "document" with notIndexed data', async () => {
    const luck1 = await Character.create({
      age: 102,
      firstName: 'luck',
      lastName: 'Skywalker',
      desc: 'this is a something stored inside data',
    });

    let sky = await Character.findById(luck1._id);

    expect(sky.age).toEqual(102);
    expect(sky.firstName).toEqual('luck');
    expect(sky.lastName).toEqual('Skywalker');
    expect(sky.desc).toBeUndefined();

    sky = await Character.findById(luck1._id, { getData: true });

    expect(sky.age).toEqual(102);
    expect(sky.firstName).toEqual('luck');
    expect(sky.lastName).toEqual('Skywalker');
    expect(sky.desc).toEqual('this is a something stored inside data');
  });

  it('Updates a "document" with notIndexed data', async () => {
    const luck1 = await Character.create({
      age: 102,
      firstName: 'luck',
      lastName: 'Skywalker',
      desc: 'this is a something stored inside data',
    });

    let sky = await Character.findById(luck1._id);

    expect(sky.age).toEqual(102);
    expect(sky.firstName).toEqual('luck');
    expect(sky.lastName).toEqual('Skywalker');
    expect(sky.desc).toBeUndefined();

    sky = await Character.findById(luck1._id, { getData: true });

    expect(sky.age).toEqual(102);
    expect(sky.firstName).toEqual('luck');
    expect(sky.lastName).toEqual('Skywalker');
    expect(sky.desc).toEqual('this is a something stored inside data');

    await Character.updateById(luck1._id, {
      age: 103,
      firstName: 'luck',
      lastName: 'Skywalker',
      desc: '123456',
    });

    sky = await Character.findById(luck1._id);

    expect(sky.age).toEqual(103);
    expect(sky.firstName).toEqual('luck');
    expect(sky.lastName).toEqual('Skywalker');
    expect(sky.desc).toBeUndefined();

    sky = await Character.findById(luck1._id, { getData: true });

    expect(sky.age).toEqual(103);
    expect(sky.firstName).toEqual('luck');
    expect(sky.lastName).toEqual('Skywalker');
    expect(sky.desc).toEqual('123456');
  });

  it('Gets a "document" with notIndexed data by filter', async () => {
    const yoda = await Character.create({
      age: 205,
      firstName: 'yoda',
      lastName: 'jedi',
      desc: '1',
    });

    let sky = await Character.findOne({ firstName: 'yoda' });

    expect(sky.age).toEqual(205);
    expect(sky.firstName).toEqual('yoda');
    expect(sky.lastName).toEqual('jedi');
    expect(sky.desc).toBeUndefined();

    sky = await Character.findOne({ firstName: 'yoda' }, { getData: true });

    expect(sky.age).toEqual(205);
    expect(sky.firstName).toEqual('yoda');
    expect(sky.lastName).toEqual('jedi');
    expect(sky.desc).toEqual('1');
  });

  it('Gets Many "document" with notIndexed data ', async () => {
    await Character.create({
      age: 206,
      firstName: 'yoda',
      lastName: 'jedi',
      desc: '1',
    });
    await Character.create({
      age: 206,
      firstName: 'yoda',
      lastName: 'jedi',
      desc: '2',
    });
    await Character.create({
      age: 206,
      firstName: 'yoda',
      lastName: 'jedi',
      desc: '3',
    });

    let sky = await Character.findMany({ age: 206 });
    expect(sky).toHaveLength(3);

    sky = await Character.findMany({ age: 206 }, { getData: true });
    expect(sky).toHaveLength(3);

    expect(sky[0].age).toEqual(206);
    expect(sky[0].firstName).toEqual('yoda');
    expect(sky[0].lastName).toEqual('jedi');
    expect(sky[0].desc).toEqual('3');
    expect(sky[1].desc).toEqual('2');
    expect(sky[2].desc).toEqual('1');
  });
  it('Gets history of "document" with notIndexed data', async () => {
    const luck1 = await Character.create({
      age: 103,
      firstName: 'luck',
      lastName: 'Skywalker',
      desc: '1',
    });

    await Character.updateById(luck1._id, {
      age: 103,
      firstName: 'luck',
      lastName: 'Skywalker',
      desc: '2',
    });

    let sky = await Character.history(luck1._id);
    expect(sky[0].desc).toBeUndefined();
    expect(sky[1].desc).toBeUndefined();

    sky = await Character.history(luck1._id, { getData: true });
    expect(sky[0].desc).toEqual('2');
    expect(sky[1].desc).toEqual('1');
  });

  it('Updates a "document" with notIndexed data by filter', async () => {
    const luck1 = await Character.create({
      age: 107,
      firstName: 'luck',
      lastName: 'Skywalker',
      desc: 'this is a something stored inside data',
    });

    await Character.updateOne(
      {
        age: 107,
        firstName: 'luck',
        lastName: 'Skywalker',
      },
      {
        age: 103,
        firstName: 'luck',
        lastName: 'Skywalker',
        desc: '123456',
      }
    );

    let sky = await Character.findById(luck1._id);

    expect(sky.age).toEqual(103);
    expect(sky.firstName).toEqual('luck');
    expect(sky.lastName).toEqual('Skywalker');
    expect(sky.desc).toBeUndefined();

    sky = await Character.findById(luck1._id, { getData: true });

    expect(sky.age).toEqual(103);
    expect(sky.firstName).toEqual('luck');
    expect(sky.lastName).toEqual('Skywalker');
    expect(sky.desc).toEqual('123456');
  });

  it('Updates Many "document" with notIndexed data ', async () => {
    await Character.create({
      age: 207,
      firstName: 'yoda',
      lastName: 'jedi',
      desc: '1',
    });
    await Character.create({
      age: 207,
      firstName: 'yoda',
      lastName: 'jedi',
      desc: '2',
    });
    await Character.create({
      age: 207,
      firstName: 'yoda',
      lastName: 'jedi',
      desc: '3',
    });

    await Character.updateMany(
      {
        age: 207,
        firstName: 'yoda',
        lastName: 'jedi',
      },
      {
        age: 207,
        firstName: 'yoda',
        lastName: 'jedi',
        desc: '123456',
      }
    );

    let sky = await Character.findMany({ age: 207 });
    expect(sky).toHaveLength(3);

    sky = await Character.findMany({ age: 207 }, { getData: true });
    expect(sky).toHaveLength(3);

    expect(sky[0].age).toEqual(207);
    expect(sky[0].firstName).toEqual('yoda');
    expect(sky[0].lastName).toEqual('jedi');
    expect(sky[0].desc).toEqual('123456');
    expect(sky[1].desc).toEqual('123456');
    expect(sky[2].desc).toEqual('123456');
  });

  it('Gets data with getData', async () => {
    const yoda = await Character.create({
      age: 209,
      firstName: 'yoda',
      lastName: 'jedi',
      desc: '1',
    });

    let sky = await Character.findById(yoda._id);
    expect(sky.age).toEqual(209);
    expect(sky.firstName).toEqual('yoda');
    expect(sky.lastName).toEqual('jedi');
    expect(sky.desc).toBeUndefined();
    await Character.getData(sky);
    expect(sky.desc).toEqual('1');

    sky = await Character.findOne({ age: 209 });
    expect(sky.age).toEqual(209);
    expect(sky.firstName).toEqual('yoda');
    expect(sky.lastName).toEqual('jedi');
    expect(sky.desc).toBeUndefined();
    await Character.getData(sky);
    expect(sky.desc).toEqual('1');
  });

  it('Gets data with getData from an array of document', async () => {
    await Character.create({
      age: 110,
      firstName: 'anakin',
      lastName: 'skywalker',
      desc: 'Obi-Wan, may the force be with you.',
    });
    await Character.create({
      age: 110,
      firstName: 'anakin',
      lastName: 'skywalker',
      desc: 'Obi-Wan, may the force be with you.',
    });

    const anakins = await Character.findMany({ firstName: 'anakin', lastName: 'skywalker' });
    expect(anakins).toHaveLength(2);
    expect(anakins[0].desc).toBeUndefined();
    expect(anakins[1].desc).toBeUndefined();

    await Character.getData(anakins[0]);
    await Character.getData(anakins[1]);

    expect(anakins[0].desc).toEqual('Obi-Wan, may the force be with you.');
    expect(anakins[1].desc).toEqual('Obi-Wan, may the force be with you.');
  });

  it('Create a doc with relation', async () => {
    const saber = await Lightsaber.create({
      power: 110,
      color: 'red',
      character: luck._id,
    });
    expect(saber.power).toEqual(110);
    expect(saber.color).toEqual('red');
    expect(saber.character).toEqual(luck._id);
    const lightsaber = await Lightsaber.findById(saber._id);
    expect(lightsaber.power).toEqual(110);
    expect(lightsaber.color).toEqual('red');
    expect(lightsaber.character).toEqual(luck._id);
    await Lightsaber.populate(lightsaber);
    expect(lightsaber.character._id).toEqual(luck._id);
    expect(lightsaber.character.age).toEqual(luck.age);
    expect(lightsaber.character.firstName).toEqual(luck.firstName);
    expect(lightsaber.character.lastName).toEqual(luck.lastName);
  });
});
