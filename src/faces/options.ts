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

export interface IGlobalOptions
  extends ITransactionOptions,
    ITransactionsOptions,
    IBlockOptions,
    IBlocksOptions {}

export type AmountType = string | { winston?: string; ar?: string }; // string = ar
export type OwnerType = string | { address?: string; key?: string }; // string = address
export type DataType = string | { size: string; type: string }; // string = type
export type RequestType = 'transaction' | 'block' | 'transactions' | 'blocks';
