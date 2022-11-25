import { Connection } from "../../sqlite3";
import { TableDefinition } from "../../undo-log-tables";
import { Utils } from "../../utilities";
import { PrivateServices } from "../../utils/private-services";
import { SetupServices } from "../../utils/setup-services";
import { UndoLogUtilityServices } from "../../utils/undo-log-utility-services";


export class SetupServicesImpl implements SetupServices {
  private connection: Connection;
  private prefix: string;
  private utils: Utils;
  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.connection = srv.connection;
    this.prefix = srv.prefix;
    this.utils = srv.utils;
  }

  async updateUndoLogTable<T extends Record<string, any> & { id: number; }>(
    tableName: string,
    data: Partial<T> & { id: number; }
  ): Promise<void> {
    const [parameters, tail] = this.utils.toParameterList(data);
    const query = `UPDATE ${this.prefix}${tableName} SET ${tail.join(
      ", "
    )} WHERE id=$id`;
    await this.connection.run(query, parameters);
  }

  async createUndoLogTable(tableName: string, definition: TableDefinition) {
    const columns = this.utils.createColumnDefinitions(definition);
    const foreigns = this.utils.createForeignKeys(definition, this.prefix);
    const uniques = this.utils.createUniqueKeys(definition);
    const query = `CREATE TABLE ${this.prefix}${tableName} (${columns}${foreigns}${uniques});`;
    await this.connection.execute(query);
  }
}
