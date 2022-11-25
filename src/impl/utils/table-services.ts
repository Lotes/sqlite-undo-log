import { Utils } from "../../utilities";
import { PrivateServices } from "../../utils/private-services";
import { TableServices } from "../../utils/table-services";
import { UndoLogUtilityServices } from "../../utils/undo-log-utility-services";


export class TableServicesImpl implements TableServices {
  private prefix: string;
  private utils: Utils;

  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.prefix = srv.prefix;
    this.utils = srv.utils;
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
