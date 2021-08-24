import Arweave from 'arweave';
import {
  GQLAmountInterface,
  GQLBlockInterface,
  GQLMetaDataInterface,
  GQLOwnerInterface,
  GQLTagInterface,
  GQLTransactionInterface,
} from '../faces/gql';
import { log, LOGS } from '../utils/log';

export default class ArdbTransaction implements GQLTransactionInterface {
  private _id: string;
  private _anchor: string;
  private _signature: string;
  private _recipient: string;
  private _owner: GQLOwnerInterface;
  private _fee: GQLAmountInterface;
  private _quantity: GQLAmountInterface;
  private _data: GQLMetaDataInterface;
  private _tags: GQLTagInterface[];
  private _block: GQLBlockInterface;
  private _parent: { id: string };

  private arweave: Arweave;

  // Getters
  public get id(): string {
    if (!this._id) log.show("ID wasn't defined, make sure you have selected to return it.");
    return this._id;
  }

  public get anchor(): string {
    if (!this._anchor) log.show("Anchor wasn't defined, make sure you have selected to return it.");
    return this._anchor;
  }

  public get signature(): string {
    if (!this._signature) log.show("Signature wasn't defined, make sure you have selected to return it.");
    return this._signature;
  }

  public get recipient(): string {
    if (!this._recipient) log.show("Recipient wasn't defined, make sure you have selected to return it.");
    return this._recipient;
  }

  public get owner(): GQLOwnerInterface {
    if (!this._owner) log.show("Owner wasn't defined, make sure you have selected to return it.");
    return this._owner;
  }

  public get fee(): GQLAmountInterface {
    if (!this._fee) log.show("Fee wasn't defined, make sure you have selected to return it.");
    return this._fee;
  }

  public get quantity(): GQLAmountInterface {
    if (!this._quantity) log.show("Quantity wasn't defined, make sure you have selected to return it.");
    return this._quantity;
  }

  public get data(): GQLMetaDataInterface {
    if (!this._data) log.show("Data wasn't defined, make sure you have selected to return it.");
    return this._data;
  }

  public get tags(): GQLTagInterface[] {
    if (!this._tags) log.show("Tags wasn't defined, make sure you have selected to return it.");
    return this._tags;
  }

  public get block(): GQLBlockInterface {
    if (!this._block) log.show("Block wasn't defined, make sure you have selected to return it.");
    return this._block;
  }

  public get parent(): { id: string } {
    if (!this._parent || !this._parent.id) log.show("Parent wasn't defined, make sure you have selected to return it.");
    return this._parent;
  }

  constructor(obj: Partial<GQLTransactionInterface>, arweave: Arweave) {
    this._id = obj.id;
    this._anchor = obj.anchor;
    this._signature = obj.signature;
    this._recipient = obj.recipient;
    this._owner = obj.owner;
    this._fee = obj.fee;
    this._quantity = obj.quantity;
    this._data = obj.data;
    this._tags = obj.tags;
    this._block = obj.block;

    if (obj.parent && obj.parent.id) {
      this._parent = obj.parent;
    }

    this.arweave = arweave;
  }
}
