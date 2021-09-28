import Blockweave from 'blockweave';
import Arweave from 'arweave';
import ArDB from '../ardb';
import ArdbBlock from '../models/block';
import ArdbTransaction from '../models/transaction';
import { LOGS } from '../utils/log';

jest.setTimeout(10000);

describe('USING ARWEAVE', () => {
  let ardb: ArDB;
  beforeAll(async () => {
    jest.setTimeout(100000);
    const arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    });
    ardb = new ArDB(arweave, LOGS.ARWEAVE);
  });

  test('transaction', async () => {
    const res = await ardb.search('transactions').id('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY').findOne();
    expect(res.id).toBe('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY');
    const tx = await ardb.search('transaction').id('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY').findOne();
    expect(tx.id).toBe('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY');
  });

  test('transactions', async () => {
    let res = await ardb.search('transactions').appName('SmartWeaveAction').tag('Type', 'ArweaveActivity').find();
    expect(res.length).toBe(10);

    res = await ardb.search('transactions').tag('App-Name', 'SmartWeaveAction').find();
    expect(res.length).toBe(10);
  });

  test('next', async () => {
    const res = (await ardb.search('transactions').appName('SmartWeaveAction').findOne()) as ArdbTransaction;
    const res2 = (await ardb.next()) as ArdbTransaction;

    expect(res.id).not.toBe(res2.id);
  });

  test('block', async () => {
    const block = (await ardb
      .search('block')
      .id('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_')
      .findOne()) as ArdbBlock;
    expect(block.id).toBe('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_');
  });

  test('blocks', async () => {
    const res = (await ardb
      .search('blocks')
      .ids(['Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_'])
      .findOne()) as ArdbBlock;
    expect(res.id).toBe('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_');

    const blocks = (await ardb
      .search('blocks')
      .id('BkJ_h-GGIwfek-cJd-RaJrOXezAc0PmklItzzCLIF_aSk36FEjpOBuBDS27D2K_T')
      .findAll()) as ArdbBlock[];
    expect(blocks.length).toBe(1);
    expect(blocks[0].id).toBe('BkJ_h-GGIwfek-cJd-RaJrOXezAc0PmklItzzCLIF_aSk36FEjpOBuBDS27D2K_T');
  });

  test('only', async () => {
    const res = (await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .only('owner')
      .findOne()) as ArdbTransaction;

    expect(res.id).toBeUndefined();
    expect(res).toHaveProperty('owner');
    expect(res.owner).toHaveProperty('address');
    expect(res.owner).toHaveProperty('key');

    const res2 = (await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .only(['id', 'owner.address'])
      .findOne()) as ArdbTransaction;

    expect(res2).toHaveProperty('id');
    expect(res2.owner).toHaveProperty('address');
    expect(Object.keys(res2.owner).length).toBe(1);
  });

  test('exclude', async () => {
    const res = await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .exclude('id')
      .findOne();

    expect(res.id).toBeUndefined();
    expect(res).toHaveProperty('anchor');
    expect(res).toHaveProperty('signature');

    const res2 = (await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .exclude(['id', 'owner.address'])
      .findOne()) as ArdbTransaction;

    expect(res2.id).toBeUndefined();
    expect(res2.owner.address).toBeUndefined();
    expect(res2.owner).toHaveProperty('key');
  });

  test('empty result', async () => {
    const txs = await ardb.search('transactions').tag('Asdfasdfasdf', 'Ushdhsha').findAll();

    expect(txs.length).toBe(0);
  });

  test('order', async () => {
    let txs = await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .only('id')
      .sort('HEIGHT_ASC')
      .find();

    expect(txs[0].id).toBe('5AYV-RdPCoyfjeeabHVnDGvXrFNM5azcTlkNpp7RQhE');

    txs = await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .only('id')
      .sort('HEIGHT_DESC')
      .find();

    expect(txs[0].id).not.toBe('5AYV-RdPCoyfjeeabHVnDGvXrFNM5azcTlkNpp7RQhE');
  });
});

describe('USING BLOCKWEAVE', () => {
  let ardb: ArDB;
  beforeAll(async () => {
    jest.setTimeout(100000);
    const bw = new Blockweave({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    });
    ardb = new ArDB(bw, LOGS.ARWEAVE);
  });

  test('transaction', async () => {
    const res = await ardb.search('transactions').id('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY').findOne();
    expect(res.id).toBe('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY');
    const tx = await ardb.search('transaction').id('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY').findOne();
    expect(tx.id).toBe('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY');
  });

  test('transactions', async () => {
    let res = await ardb.search('transactions').appName('SmartWeaveAction').tag('Type', 'ArweaveActivity').find();
    expect(res.length).toBe(10);

    res = await ardb.search('transactions').tag('App-Name', 'SmartWeaveAction').find();
    expect(res.length).toBe(10);
  });

  test('next', async () => {
    const res = (await ardb.search('transactions').appName('SmartWeaveAction').findOne()) as ArdbTransaction;
    const res2 = (await ardb.next()) as ArdbTransaction;

    expect(res.id).not.toBe(res2.id);
  });

  test('block', async () => {
    const block = (await ardb
      .search('block')
      .id('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_')
      .findOne()) as ArdbBlock;
    expect(block.id).toBe('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_');
  });

  test('blocks', async () => {
    const res = (await ardb
      .search('blocks')
      .ids(['Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_'])
      .findOne()) as ArdbBlock;
    expect(res.id).toBe('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_');

    const blocks = (await ardb
      .search('blocks')
      .id('BkJ_h-GGIwfek-cJd-RaJrOXezAc0PmklItzzCLIF_aSk36FEjpOBuBDS27D2K_T')
      .findAll()) as ArdbBlock[];
    expect(blocks.length).toBe(1);
    expect(blocks[0].id).toBe('BkJ_h-GGIwfek-cJd-RaJrOXezAc0PmklItzzCLIF_aSk36FEjpOBuBDS27D2K_T');
  });

  test('only', async () => {
    const res = (await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .only('owner')
      .findOne()) as ArdbTransaction;

    expect(res.id).toBeUndefined();
    expect(res).toHaveProperty('owner');
    expect(res.owner).toHaveProperty('address');
    expect(res.owner).toHaveProperty('key');

    const res2 = (await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .only(['id', 'owner.address'])
      .findOne()) as ArdbTransaction;

    expect(res2).toHaveProperty('id');
    expect(res2.owner).toHaveProperty('address');
    expect(Object.keys(res2.owner).length).toBe(1);
  });

  test('exclude', async () => {
    const res = await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .exclude('id')
      .findOne();

    expect(res.id).toBeUndefined();
    expect(res).toHaveProperty('anchor');
    expect(res).toHaveProperty('signature');

    const res2 = (await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .exclude(['id', 'owner.address'])
      .findOne()) as ArdbTransaction;

    expect(res2.id).toBeUndefined();
    expect(res2.owner.address).toBeUndefined();
    expect(res2.owner).toHaveProperty('key');
  });

  test('empty result', async () => {
    const txs = await ardb.search('transactions').tag('Asdfasdfasdf', 'Ushdhsha').findAll();

    expect(txs.length).toBe(0);
  });

  test('order', async () => {
    let txs = await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .only('id')
      .sort('HEIGHT_ASC')
      .find();

    expect(txs[0].id).toBe('5AYV-RdPCoyfjeeabHVnDGvXrFNM5azcTlkNpp7RQhE');

    txs = await ardb
      .search('transactions')
      .appName('SmartWeaveAction')
      .tag('Type', 'ArweaveActivity')
      .only('id')
      .sort('HEIGHT_DESC')
      .find();

    expect(txs[0].id).not.toBe('5AYV-RdPCoyfjeeabHVnDGvXrFNM5azcTlkNpp7RQhE');
  });
});
