import { UndoLogServices } from "../..";
import { DatabaseManipulationServices } from "../../utils/database-manipulation-services";
import { TableServices } from "../../utils/table-services";

export class TableServicesImpl implements TableServices {
  private prefix: string;
  private utils: DatabaseManipulationServices;

  constructor(srv: UndoLogServices) {
    this.prefix = srv.installations.prefix;
    this.utils = srv.databases.manipulations;
  }

  insertIntoUndoLogTable<T extends Record<string, any>>(
    tableName: string,
    row: T
  ): Promise<number> {
    return this.utils.insertIntoTable<T>(`${this.prefix}${tableName}`, row);
  }
  insertBlindlyIntoUndoLogTable<T extends Record<string, any>, I extends keyof T>(tableName: string, row: Omit<T, I>): Promise<number> {
    return this.utils.insertBlindlyIntoTable<T, I>(`${this.prefix}${tableName}`, row);
  }
}
