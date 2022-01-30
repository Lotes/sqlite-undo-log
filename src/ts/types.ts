import { TableColumn } from "./utils";

export type SqliteType = "TEXT" | "NUMERIC" | "INTEGER" | "REAL" | "BLOB";
export interface SqliteColumnDefinition {
  type: SqliteType;
  canBeNull?: boolean;
  check?: string;
}
export type SqliteColumn = SqliteType | SqliteColumnDefinition;
export interface TableColumns {
  [name: string]: SqliteColumn;
}
export interface ForeignKey {
  referencedTable: string;
  column: string;
  onDelete: "CASCADE" | "SET_NULL" | "NOTHING";
}
export interface TableForeignKeys {
  [name: string]: ForeignKey;
}
export interface TableDefinition {
  primaryKey: string[];
  columns: TableColumns;
  uniques?: string[][];
  foreignKeys?: TableForeignKeys;
}
export interface TableDefinitions {
  [name: string]: TableDefinition;
}

export type Parameters = Record<string, string | number | boolean>;
export type Row = Record<string, string | number | boolean>;
export interface RunResult {
  lastID?: number;
  changes?: number;
}

export interface Connection {
  escapeString(str: string): string;
  execute(query: string): Promise<void>;
  run(query: string, parameters?: Parameters): Promise<RunResult>;
  getSingle<T = Row>(query: string, parameters?: Parameters): Promise<T | null>;
  getAll<T = Row>(query: string, parameters?: Parameters): Promise<T[]>;
}

export interface Database {
  connect(): Promise<Connection>;
}
