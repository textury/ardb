import { GQLBlockInterface } from '../faces/gql';
import { log, LOGS } from '../utils/log';

export class Block implements GQLBlockInterface {
  private _id: string;
  private _timestamp: number;
  private _height: number;
  private _previous: string;

  constructor(obj: Partial<GQLBlockInterface>) {
    this._id = obj.id;
    this._timestamp = obj.timestamp;
    this._height = obj.height;
    this._previous = obj.previous;
  }

  // Getters
  public get id(): string {
    if (!this._id) log.show("ID wasn't defined, make sure you have selected to return it.");
    return this._id;
  }

  public get timestamp(): number {
    if (!this._timestamp) log.show("Timestamp wasn't defined, make sure you have selected to return it.");
    return this._timestamp;
  }

  public get height(): number {
    if (!this._height) log.show("Height wasn't defined, make sure you have selected to return it.");
    return this._height;
  }

  public get previous(): string {
    if (!this._previous) log.show("Previous wasn't defined, make sure you have selected to return it.");
    return this._previous;
  }
}
