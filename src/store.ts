export class Store {
  static schemas = {};
  static add(name: string, schema: any) {
    Store.schemas[name] = schema;
  }
  static get(name: string) {
    return Store.schemas[name];
  }
}
