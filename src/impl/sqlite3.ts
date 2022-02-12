import sqlite from "sqlite3";
import { Database, Connection, RunResult, Parameters } from "../sqlite3";

class AdapterDb {
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

export class ConnectionImpl implements Connection {
  private db: AdapterDb;
  constructor(db: sqlite.Database) {
    this.db = new AdapterDb(db);
  }
  escapeString(str: string): string {
    return `'${str.replace(/\'/g, "''")}'`;
  }
  async close(): Promise<void> {
    await this.db.close();
  }
  async execute(query: string): Promise<void> {
    await this.track(query);
    await this.db.exec(query);
  }
  async run(query: string, parameters?: Parameters): Promise<RunResult> {
    await this.track(query, parameters);
    return await this.db.run(query, parameters);
  }
  async getSingle<T>(
    query: string,
    parameters?: Parameters
  ): Promise<T | null> {
    await this.track(query, parameters);
    return await this.db.get<T>(query, parameters);
  }
  async getAll<T>(query: string, parameters?: Parameters): Promise<T[]> {
    await this.track(query, parameters);
    return await this.db.all<T>(query, parameters);
  }
  private async track(
    query: string,
    parameters: Parameters = {}
  ): Promise<void> {
    const where = new Error().stack!;
    await this.db.run(
      `CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, query TEXT, parameters TEXT, location TEXT)`
    );
    await this.db.run(
      `INSERT INTO logs (query, parameters, location) VALUES ($query, $parameters, $location)`,
      {
        $query: query,
        $parameters: JSON.stringify(parameters),
        $location: where,
      }
    );
  }
}

export class DatabaseImpl implements Database {
  private fileName: string;
  constructor(fileName?: string) {
    this.fileName = fileName || ":memory:";
  }
  connect(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const db = new sqlite.Database(
        this.fileName,
        sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE,
        async (err) => {
          if (err == null) {
            const connection: Connection = new ConnectionImpl(db);
            connection
              .execute("PRAGMA foreignKeys=1")
              .then(() => resolve(connection))
              .catch(reject);
            return;
          }
          return reject(err);
        }
      );
    });
  }
}
