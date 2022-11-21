import sqlite from "sqlite3";
import { Database, Connection, RunResult, Parameters, ConnectionListener, WeakConnection } from "../sqlite3";

class NodeSqlite3AdapterDb {
  private db: sqlite.Database;
  constructor(db: sqlite.Database) {
    this.db = db;
  }
  close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if (err != null) {
          return reject(err);
        }
        return resolve();
      });
    });
  }
  exec(query: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.exec(query, function (err) {
        if (err == null) {
          return resolve();
        }
        return reject(err);
      });
    });
  }
  run(query: string, parameters?: any): Promise<RunResult> {
    return new Promise<RunResult>((resolve, reject) => {
      this.db.run(query, parameters, function (err) {
        if (err == null) {
          return resolve(this);
        }
        return reject(err);
      });
    });
  }
  get<T>(query: string, parameters?: any): Promise<T | null> {
    return new Promise<T | null>((resolve, reject) => {
      this.db.get(query, parameters, function (err, row) {
        if (err == null) {
          return resolve(row || null);
        }
        return reject(err);
      });
    });
  }
  all<T>(query: string, parameters?: any): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      this.db.all(query, parameters, function (err, rows) {
        if (err == null) {
          return resolve(rows || []);
        }
        return reject(err);
      });
    });
  }
}

export class NodeSqlite3ConnectionImpl implements Connection {
  private listeners: ConnectionListener[] = [];
  constructor(private db: NodeSqlite3AdapterDb) {}
  clone(): WeakConnection {
    return new NodeSqlite3ConnectionImpl(this.db); //returns a clone with no listeners!
  }
  addConnectionListener(listener: ConnectionListener): void {
    this.listeners.push(listener);
  }
  removeConnectionListener(listener: ConnectionListener): void {
    this.listeners = this.listeners.filter(ls => ls === listener);
  }
  escapeString(str: string): string {
    return `'${str.replace(/\'/g, "''")}'`;
  }
  async close(): Promise<void> {
    return this.db.close();
  }
  async execute(query: string): Promise<void> {
    await this.track(query);
    return this.db.exec(query);
  }
  async run(query: string, parameters?: Parameters): Promise<RunResult> {
    await this.track(query, parameters);
    return this.db.run(query, parameters);
  }
  async getSingle<T>(
    query: string,
    parameters?: Parameters
  ): Promise<T | null> {
    await this.track(query, parameters);
    return this.db.get<T>(query, parameters);
  }
  async getAll<T>(query: string, parameters?: Parameters): Promise<T[]> {
    await this.track(query, parameters);
    return this.db.all<T>(query, parameters);
  }
  private async track(
    query: string,
    parameters: Parameters = {}
  ): Promise<void> {
    const where = new Error().stack!;
    const event = {
      location: where,
      query,
      parameters
    };
    for (const listener of this.listeners) {
      await listener(event);
    }
  }
}

export class NodeSqlite3DatabaseImpl implements Database {
  private fileName: string;
  constructor(fileName?: string) {
    this.fileName = fileName || ":memory:";
  }
  connect(): Promise<Connection> {
    const connection = new Promise<Connection>((resolve, reject) => {
      const db = new sqlite.Database(
        this.fileName,
        sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE,
        async (err) => {
          if (err == null) {
            const connection: Connection = new NodeSqlite3ConnectionImpl(new NodeSqlite3AdapterDb(db));
            resolve(connection);
            return;
          }
          return reject(err);
        }
      );
    });
    return connection;
  }
}
