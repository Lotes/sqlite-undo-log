export type Parameters = Record<string, string|number|boolean>;
export type Row = Record<string, string|number|boolean>;
export interface RunResult {
  lastID?: number;
  changes?: number;
}

export interface Connection {
  execute(query: string): Promise<void>; 
  run(query: string, parameters?: Parameters): Promise<RunResult>; 
  getSingle<T=Row>(query: string, parameters?: Parameters): Promise<T|null>; 
  getAll<T=Row>(query: string, parameters?: Parameters): Promise<T[]>; 
}

export interface Database {
  connect(): Promise<Connection>;
}
