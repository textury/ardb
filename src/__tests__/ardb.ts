import Arweave from 'arweave';
import ArDB from '../ardb';

let ardb;
beforeAll(async () => {
  jest.setTimeout(100000);
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });
  ardb = new ArDB(arweave, 0);
});

test('transaction', async () => {
  const res = await ardb.search('transactions').id('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY').findOne();
  expect(res[0].node.id).toBe('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY');
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
  const res = await ardb.search('transactions').appName('SmartWeaveAction').findOne();
  const res2 = await ardb.next();

  expect(res[0].node.id).not.toBe(res2[0].node.id);
});

test('block', async () => {
  const block = await ardb
    .search('block')
    .id('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_')
    .findOne();
  expect(block.id).toBe('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_');
});

test('blocks', async () => {
  const res = await ardb
    .search('blocks')
    .ids(['Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_'])
    .findOne();
  expect(res[0].node.id).toBe('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_');

  const blocks = await ardb
    .search('blocks')
    .id('BkJ_h-GGIwfek-cJd-RaJrOXezAc0PmklItzzCLIF_aSk36FEjpOBuBDS27D2K_T')
    .findAll();
  expect(blocks.length).toBe(1);
  expect(blocks[0].node.id).toBe('BkJ_h-GGIwfek-cJd-RaJrOXezAc0PmklItzzCLIF_aSk36FEjpOBuBDS27D2K_T');
});

test('only', async () => {
  const res = await ardb
    .search('transactions')
    .appName('SmartWeaveAction')
    .tag('Type', 'ArweaveActivity')
    .only('id')
    .findOne();
  expect(res.length).toBe(1);
  expect(res[0].node).toHaveProperty('id');
  expect(Object.keys(res[0].node).length).toBe(1);

  const res2 = await ardb
    .search('transactions')
    .appName('SmartWeaveAction')
    .tag('Type', 'ArweaveActivity')
    .only(['id', 'owner.address'])
    .findOne();
  expect(res2.length).toBe(1);
  expect(res2[0].node).toHaveProperty('id');
  expect(Object.keys(res2[0].node).length).toBe(2);
  expect(res2[0].node.owner).toHaveProperty('address');
  expect(Object.keys(res2[0].node.owner).length).toBe(1);
});

test('exclude', async () => {
  const res = await ardb
    .search('transactions')
    .appName('SmartWeaveAction')
    .tag('Type', 'ArweaveActivity')
    .exclude('id')
    .findOne();
  expect(res.length).toBe(1);
  expect(res[0].node).not.toHaveProperty('id');
  expect(res[0].node).toHaveProperty('anchor');
  expect(res[0].node).toHaveProperty('signature');
  expect(Object.keys(res[0].node).length).toBe(10);

  const res2 = await ardb
    .search('transactions')
    .appName('SmartWeaveAction')
    .tag('Type', 'ArweaveActivity')
    .exclude(['id', 'owner.address'])
    .findOne();
  expect(res2.length).toBe(1);
  expect(Object.keys(res2[0].node).length).toBe(10);
  expect(res2[0].node).not.toHaveProperty('id');
  expect(res2[0].node.owner).not.toHaveProperty('address');
  expect(res2[0].node.owner).toHaveProperty('key');
});

test('order', async () => {
  let res = await ardb
    .search('transactions')
    .appName('SmartWeaveAction')
    .tag('Type', 'ArweaveActivity')
    .only('id')
    .sort('HEIGHT_ASC')
    .find();

  expect(res[0].node.id).toBe('5AYV-RdPCoyfjeeabHVnDGvXrFNM5azcTlkNpp7RQhE');

  res = await ardb
    .search('transactions')
    .appName('SmartWeaveAction')
    .tag('Type', 'ArweaveActivity')
    .only('id')
    .sort('HEIGHT_DESC')
    .find();

  expect(res[0].node.id).not.toBe('5AYV-RdPCoyfjeeabHVnDGvXrFNM5azcTlkNpp7RQhE');
});
