import { Connection } from "../../sqlite3";
import { DatabaseQueryServices } from "../../utils/database-query-services";
import { DatabaseUtilitiesServices } from "../../utils/database-utilities-services";
import { PrivateServices } from "../../utils/private-services";
import { UndoLogUtilityServices } from "../../utils/undo-log-utility-services";

export class DatabaseQueryServicesImpl implements DatabaseQueryServices {
  private connection: Connection;
  private utils: DatabaseUtilitiesServices;
  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.connection = srv.connection;
    this.utils = srv.databases.utils;
  }

  async tableHas<T extends Record<string, any> & { id: number }>(
    tableName: string,
    expected: T
  ): Promise<[boolean, string[]]> {
    const query = `SELECT * FROM ${tableName} WHERE id=$id LIMIT 1`;
    const actual = await this.connection.getSingle<T>(query, {
      $id: expected.id,
    });
    const errors: string[] = [];
    if (actual == null) {
      errors.push(
        `Expected table '${tableName}' to have a row with the id ${expected.id}.`
      );
      return [false, errors];
    }
    Object.getOwnPropertyNames(expected).forEach((n) => {
      if (!this.utils.equals(expected[n], actual[n])) {
        errors.push(
          `Expected table '${tableName}' to have a row with the property '${n}' set to '${expected[n]}', but '${actual[n]}' was given.`
        );
      }
    });
    return [errors.length === 0, errors];
  }

  async hasTableId(name: string, id: number) {
    return (await this.tableHas(name, { id }))[0];
  }
}
