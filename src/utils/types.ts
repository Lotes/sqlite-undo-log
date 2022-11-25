import { SqliteType } from "../undo-log-tables";

export type OldOrNew = "old"|"new";

export interface NameValuePair {
  name: string;
  value: string;
}

export interface ColumnValue {
  value: string;
  type: SqliteType;
}

export interface NameValueType extends ColumnValue {
  name: string;
}

export interface PragmaTableInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string;
  pk: number;
}