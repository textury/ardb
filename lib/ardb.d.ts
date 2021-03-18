import Arweave from 'arweave';
import { GQLEdgeBlockInterface, GQLEdgeTransactionInterface } from './faces/gql';
import { IGlobalOptions, RequestType } from './faces/options';
/**
 * Arweave as a database.
 * To easily interact with Arweave's graphql endpoint.
 */
export default class ArDB {
    private arweave;
    private reqType;
    private options;
    private logs;
    private after;
    private afterRegex;
    /**
     *
     * @param arweave An arweave instance
     * @param logs Show logs. 0 = false, 1 = true, 2 = if arweave instance has log enabled.
     */
    constructor(arweave: Arweave, logs?: number);
    /**
     * Search is the first function called before doing a find.
     * @param col What type of search are we going to do.
     */
    search(type: RequestType): this;
    id(id: string): this;
    ids(ids: string[]): this;
    appName(name: string): this;
    type(type: string): this;
    tags(tags: {
        name: string;
        values: string[];
    }[]): this;
    tag(name: string, values: string | string[]): this;
    from(owners: string | string[]): this;
    to(recipients: string | string[]): this;
    limit(limit: number): this;
    sort(sort: 'HEIGHT_DESC' | 'HEIGHT_ASC'): this;
    cursor(after: string): this;
    /** Ready to run **/
    find(filters?: IGlobalOptions): Promise<import("./faces/gql").GQLBlockInterface | import("./faces/gql").GQLTransactionInterface | GQLEdgeTransactionInterface[] | GQLEdgeBlockInterface[]>;
    findOne(filters?: IGlobalOptions): Promise<import("./faces/gql").GQLBlockInterface | import("./faces/gql").GQLTransactionInterface | GQLEdgeTransactionInterface[] | GQLEdgeBlockInterface[]>;
    findAll(filters?: IGlobalOptions): Promise<any[] | import("./faces/gql").GQLBlockInterface | import("./faces/gql").GQLTransactionInterface>;
    /**
     * To run with the cursor
     */
    next(): Promise<import("./faces/gql").GQLBlockInterface | import("./faces/gql").GQLTransactionInterface | GQLEdgeTransactionInterface[] | GQLEdgeBlockInterface[]>;
    run(query: string): Promise<import("./faces/gql").GQLBlockInterface | import("./faces/gql").GQLTransactionInterface | GQLEdgeTransactionInterface[] | GQLEdgeBlockInterface[]>;
    runAll(query: string): Promise<any[] | import("./faces/gql").GQLBlockInterface | import("./faces/gql").GQLTransactionInterface>;
    /** Helpers */
    private checkSearchType;
    private get;
    private construct;
    private log;
}
