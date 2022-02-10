export type Parameters = Record<string, string | number | boolean | null>;
export interface RunResult {
  lastID?: number;
  changes?: number;
}

export interface Connection {
  close(): Promise<void>;
  escapeString(str: string): string;
  execute(query: string): Promise<void>;
  run(query: string, parameters?: Parameters): Promise<RunResult>;
  getSingle<T>(query: string, parameters?: Parameters): Promise<T | null>;
  getAll<T>(query: string, parameters?: Parameters): Promise<T[]>;
}

export interface Database {
  connect(): Promise<Connection>;
}