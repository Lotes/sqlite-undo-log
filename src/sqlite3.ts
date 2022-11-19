import { ColumnValue } from "./utils";

export type Parameters = Record<string, string | number | boolean | null>;
export interface RunResult {
  lastID?: number;
  changes?: number;
}

export interface ConnectionListenerEvent {
  query: string;
  parameters: Parameters;
  location: string;
}
export type ConnectionListener = (event: ConnectionListenerEvent) => void;

export interface WeakConnection {
  escapeString(str: string): string;
  execute(query: string): Promise<void>;
  run(query: string, parameters?: Parameters): Promise<RunResult>;
  getSingle<T>(query: string, parameters?: Parameters): Promise<T | null>;
  getAll<T>(query: string, parameters?: Parameters): Promise<T[]>;
}

export interface Connection extends WeakConnection {
  addConnectionListener(listener: ConnectionListener): void;
  removeConnectionListener(listener: ConnectionListener): void;
  close(): Promise<void>;
  clone(): WeakConnection;
}

export interface Database {
  connect(): Promise<Connection>;
}

export interface Logger {
  logQuery(event: ConnectionListenerEvent): Promise<void>;
}