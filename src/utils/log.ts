import Blockweave from 'blockweave';
import Arweave from 'arweave';

export enum LOGS {
  NO,
  YES,
  ARWEAVE,
}

export class Log {
  private logs: LOGS = LOGS.ARWEAVE;
  private arweave: Arweave | Blockweave;

  init(logLevel: LOGS = LOGS.ARWEAVE, arweave: Arweave | Blockweave) {
    this.logs = logLevel;
    this.arweave = arweave;

    return this;
  }

  show(str: string, type: 'log' | 'warn' | 'error' | 'info' = 'log') {
    if (this.logs === LOGS.YES || (this.logs === LOGS.ARWEAVE && this.arweave.getConfig().api.logging)) {
      console[type](str);
    }
  }
}

export const log = new Log();
