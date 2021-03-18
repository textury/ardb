import Arweave from 'arweave';
import ArDB from '../ardb';

let ardb;
beforeAll(async () => {
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });
  ardb = new ArDB(arweave, 0);
});

test('transaction', async () => {
  const res = await ardb
    .search('transactions')
    .id('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY')
    .findOne();
  expect(res[0].node.id).toBe('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY');
  const tx = await ardb
    .search('transaction')
    .id('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY')
    .findOne();
  expect(tx.id).toBe('A235HBk5p4nEWfjBEGsAo56kYsmq7mCCyc5UZq5sgjY');
});

test('transactions', async () => {
  const res = await ardb
    .search('transactions')
    .appName('SmartWeaveAction')
    .tag('Type', 'ArweaveActivity')
    .find();
  expect(res.length).toBe(10);
});

test('next', async () => {
  const res = await ardb
    .search('transactions')
    .appName('SmartWeaveAction')
    .findOne();
  const res2 = await ardb.next();

  expect(res[0].node.id).not.toBe(res2[0].node.id);
});

test('block', async () => {
  const block = await ardb
    .search('block')
    .id('Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_')
    .findOne();
  expect(block.id).toBe(
    'Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_'
  );
});

test('blocks', async () => {
  const res = await ardb
    .search('blocks')
    .ids(['Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_'])
    .findOne();
  expect(res[0].node.id).toBe(
    'Au_cisRlqgEZuXym9cID4lXOqVTSHKcqMlwkuwxClGyD6S89n0tOc2NrhGm0dAX_'
  );
});
