import { SqliteType, TableColumn, TableDefinition } from "./undo-log-tables";

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

export interface Utils {
  createTable(tableName: string, tableDef: TableDefinition): Promise<void>;
  updateTable<T extends Record<string, any>>(
    tableName: string,
    rowid: number,
    data: Partial<T>
  ): Promise<void>;
  doesColumnExist(tableName: string, columnName: string): Promise<boolean>;
  insertIntoTable<T extends Record<string, any>>(
    name: string,
    row: T
  ): Promise<void>;
  getAllTableNames(): Promise<string[]>;
  getMetaTable(name: string): Promise<TableColumn[]>;
  doesTableExist(name: string): Promise<boolean>;
  hasTableId(name: string, id: number): Promise<boolean>;
  tableHas<T extends Record<string, any> & { id: number }>(
    tableName: string,
    row: T
  ): Promise<[boolean, string[]]>;
  deleteFromTable(tableName: string, id: number): Promise<void>;
  normalize(arg: any): any;
  equals(left: any, right: any): boolean;
  unquote(values: Record<string, ColumnValue>): Record<string, any>;
}
