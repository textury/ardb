export interface GQLPageInfoInterface {
    hasNextPage: boolean;
}
export interface GQLOwnerInterface {
    address: string;
    key: string;
}
export interface GQLAmountInterface {
    winston: string;
    ar: string;
}
export interface GQLMetaDataInterface {
    size: number;
    type: string;
}
export interface GQLTagInterface {
    name: string;
    value: string;
}
export interface GQLBlockInterface {
    id: string;
    timestamp: number;
    height: number;
    previous: string;
}
export interface GQLTransactionInterface {
    id: string;
    anchor: string;
    signature: string;
    recipient: string;
    owner: GQLOwnerInterface;
    fee: GQLAmountInterface;
    quantity: GQLAmountInterface;
    data: GQLMetaDataInterface;
    tags: GQLTagInterface[];
    block: GQLBlockInterface;
    parent: {
        id: string;
    };
}
export interface GQLEdgeTransactionInterface {
    cursor: string;
    node: GQLTransactionInterface;
}
export interface GQLEdgeBlockInterface {
    cursor: string;
    node: GQLBlockInterface;
}
export interface GQLTransactionsResultInterface {
    pageInfo: GQLPageInfoInterface;
    edges: GQLEdgeTransactionInterface[];
}
export interface GQLBlocksInterface {
    pageInfo: GQLPageInfoInterface;
    edges: GQLEdgeBlockInterface[];
}
export default interface GQLResultInterface {
    transaction: GQLTransactionInterface;
    transactions: GQLTransactionsResultInterface;
    block: GQLBlockInterface;
    blocks: GQLBlocksInterface;
}
