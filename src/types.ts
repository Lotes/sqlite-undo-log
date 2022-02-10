export type OldOrNew = "old"|"new";

export interface PragmaTableInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string;
  pk: number;
}

export class UndoLogError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface NameValuePair {
  name: string;
  value: string;
}