import sqlite from "sqlite3";
import { Database, Connection, Row, RunResult, Parameters } from "./types";

export class ConnectionImpl implements Connection {
  private db: sqlite.Database;
  constructor(db: sqlite.Database){
    this.db = db;
  }
  execute(query: string): Promise<void> {
    return new Promise<void>((resolve, reject)=>{
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
      this.db.run(query, parameters, function(err) {
        if(err == null) {
          return resolve(this);
        }
        return reject(err);
      })
    });
  }
  getSingle<T=Row>(query: string, parameters?: Parameters): Promise<T|null> {
    return new Promise<T|null>((resolve, reject)=>{
      this.db.get(query, parameters, function(err, row) {
        if(err == null) {
          return resolve(row || null);
        }
        return reject(err);
      })
    });
  }
  getAll<T=Row>(query: string, parameters?: Parameters): Promise<T[]> {
    return new Promise<T[]>((resolve, reject)=>{
      this.db.get(query, parameters, function(err, rows) {
        if(err == null) {
          return resolve(rows || []);
        }
        return reject(err);
      })
    });
  }
}

export class DatabaseImpl implements Database {
  private fileName: string;
  constructor(fileName?: string) {
    this.fileName = fileName || ":memory:";
  }
  connect(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const db = new sqlite.Database(this.fileName, (err) => {
        if(err == null) {
          const connection: Connection = new ConnectionImpl(db);
          return resolve(connection);
        }
        return reject(err);
      });
    });
  }  
}