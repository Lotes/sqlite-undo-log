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

export type Parameters = Record<string, string | number | boolean | null>;
export interface RunResult {
  lastID?: number;
  changes?: number;
}

export interface Connection {
  escapeString(str: string): string;
  execute(query: string): Promise<void>;
  run(query: string, parameters?: Parameters): Promise<RunResult>;
  getSingle<T>(query: string, parameters?: Parameters): Promise<T | null>;
  getAll<T>(query: string, parameters?: Parameters): Promise<T[]>;
}

export interface Database {
  connect(): Promise<Connection>;
}

export interface TableColumn {
  id: number;
  name: string;
  type: string;
  canBeNull?: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
}

export interface PragmaTableInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string;
  pk: number;
}

export type ChannelStatus = "READY"|"RECORDING"|"UNDOING"|"REDOING";

export interface UndoLogUtils {
  createUndoLogTable(tableName: string, definition: TableDefinition): Promise<void>;
  insertIntoUndoLogTable<T extends Record<string, any>>(tableName: string, row: T): Promise<void>;
  updateUndoLogTable<T extends Record<string, any> & {id: number}>(tableName: string, data: Partial<T>& {id: number}): Promise<void>;
  dropUndoLogTable(tableName: string): Promise<void>;
  
  markActionAsUndone(actionId: number, undone: boolean): Promise<void>;
  createTable(tableName: string, tableDef: TableDefinition): Promise<void>;
  getOrCreateReadyChannel(channel: number): Promise<void>;
  doesColumnExist(tableName: string, columnName: string): Promise<boolean>;
  updateChannel(channel: number, status: ChannelStatus): Promise<void>;
  cellToString(value: any): string|null;
  insertIntoTable<T extends Record<string, any>>(name: string, row: T): Promise<void>;
  getMetaTable(name: string): Promise<TableColumn[]>;
  doesTableExist(name: string): Promise<boolean>;
  hasTableId(name: string, id: number): Promise<boolean>;
  tableHas<T extends Record<string, any> & {id: number}>(tableName: string, row: T): Promise<boolean>;
}

export interface UndoLogSetup {
  install(): Promise<void>;
  uninstall(): Promise<void>;
  addTable(name: string, channel: number): Promise<void>;
  removeTable(name: string): Promise<void>;
}

export interface UndoLog {
  recordWithin(channel: number, categoryName: string|undefined, action: () => Promise<void>): Promise<void>;
  undo(channel: number): Promise<void>;
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

export interface Assertions {
  assertTableHas<T extends Record<string, any> & {id: number}>(tableName: string, row: T): Promise<void>;
  assertTrue(value: boolean, message: string): void;
  assertFalse(value: boolean, message: string): void;
  assertTableExists(tableName: string): Promise<void>
  assertColumnExists(tableName: string, columnName: string): Promise<void>
  assertTableDoesNotExist(tableName: string): Promise<void>;
  assertTableHasId(tableName: string, id: number): Promise<void>;
}