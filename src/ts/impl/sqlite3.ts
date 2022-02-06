import sqlite from "sqlite3";
import { Database, Connection, RunResult, Parameters } from "../types";

export class ConnectionImpl implements Connection {
  private db: sqlite.Database;
  constructor(db: sqlite.Database){
    this.db = db;
  }
  close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if(err != null) {
          return reject(err);
        }
        return resolve();
      });
    });
  }
  escapeString(str: string): string {
    return `'${str.replace(/\'/g,"''")}'`;
  }
  execute(query: string): Promise<void> {
    return new Promise<void>((resolve, reject)=>{
      this.track(query);
      this.db.exec(query, function(err) {
        if(err == null) {
          return resolve();
        }
        return reject(err);
      })
    });
  }
  run(query: string, parameters?: Parameters): Promise<RunResult> {
    return new Promise<RunResult>((resolve, reject)=>{
      this.track(query, parameters);
      this.db.run(query, parameters, function(err) {
        if(err == null) {
          return resolve(this);
        }
        return reject(err);
      })
    });
  }
  getSingle<T>(query: string, parameters?: Parameters): Promise<T|null> {
    return new Promise<T|null>((resolve, reject)=>{
      this.track(query, parameters);
      this.db.get(query, parameters, function(err, row) {
        if(err == null) {
          return resolve(row || null);
        }
        return reject(err);
      })
    });
  }
  getAll<T>(query: string, parameters?: Parameters): Promise<T[]> {
    return new Promise<T[]>((resolve, reject)=>{
      this.track(query, parameters);
      this.db.all(query, parameters, function(err, rows) {
        if(err == null) {
          return resolve(rows || []);
        }
        return reject(err);
      })
    });
  }
  private track(query: string, parameters: Parameters = {}) {
    //const where = new Error().stack?.split("\n")[3];
    //console.error({query, parameters, where});
  }
}

export class DatabaseImpl implements Database {
  private fileName: string;
  constructor(fileName?: string) {
    this.fileName = fileName || ":memory:";
  }
  connect(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const db = new sqlite.Database(this.fileName, sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE, async (err) => {
        if(err == null) {
          const connection: Connection = new ConnectionImpl(db);
          connection.execute("PRAGMA foreignKeys=1")
                    .then(() => resolve(connection))
                    .catch(reject);
          return;
        }
        return reject(err);
      });
    });
  }  
}