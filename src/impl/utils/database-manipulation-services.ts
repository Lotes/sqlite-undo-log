import { UndoLogServices } from "../..";
import { Connection } from "../../sqlite3";
import { DatabaseManipulationServices } from "../../utils/database-manipulation-services";
import { DatabaseUtilitiesServices } from "../../utils/database-utilities-services";

export class DatabaseManipulationServicesImpl implements DatabaseManipulationServices {
  private connection: Connection;
  private utils: DatabaseUtilitiesServices;
  constructor(srv: UndoLogServices) {
    this.connection = srv.connection;
    this.utils = srv.databases.utils;
  }
  
  async deleteFromTable(tableName: string, id: number): Promise<void> {
    const query = `DELETE FROM ${tableName} WHERE id=$id`;
    const parameters = { $id: id };
    await this.connection.run(query, parameters);
  }

  async updateTable<T extends Record<string, any>>(
    tableName: string,
    rowid: number,
    data: Partial<T>
  ): Promise<void> {
    let [parameters, tail] = this.utils.toParameterList({
      ...data,
      rowid,
    });
    const query = `UPDATE ${tableName} SET ${tail.join(
      ", "
    )} WHERE rowid=$rowid`;
    await this.connection.run(query, parameters);
  }

  async insertIntoTable<T extends Record<string, any>>(name: string, row: T) {
    const columns: string[] = [];
    let parameters = {};
    const values: string[] = [];
    Object.getOwnPropertyNames(row).forEach((n) => {
      columns.push(`${n}`);
      values.push(`$${n}`);
      parameters = { ...parameters, [`$${n}`]: row[n] };
    });
    const query = `INSERT INTO ${name} (${columns.join(
      ", "
    )}) VALUES (${values.join(", ")})`;
    const result = await this.connection.run(query, parameters);
    return result.lastID!;
  }

  async insertBlindlyIntoTable<T extends Record<string, any>, I extends keyof T>(
    name: string,
    row: Omit<T, I>
  ): Promise<number> {
    return await this.insertIntoTable(name, row);
  }
}
