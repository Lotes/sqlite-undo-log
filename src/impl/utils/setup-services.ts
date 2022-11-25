import { UndoLogServices } from "../..";
import { Connection } from "../../sqlite3";
import { TableDefinition } from "../../undo-log-tables";
import { DatabaseDefinitionServices } from "../../utils/database-definition-services";
import { DatabaseUtilitiesServices } from "../../utils/database-utilities-services";
import { SetupServices } from "../../utils/setup-services";

export class SetupServicesImpl implements SetupServices {
  private connection: Connection;
  private prefix: string;
  private definitions: DatabaseDefinitionServices;
  private utils: DatabaseUtilitiesServices;
  constructor(srv: UndoLogServices) {
    this.connection = srv.connection;
    this.prefix = srv.installations.prefix;
    this.definitions = srv.databases.definitions;
    this.utils =  srv.databases.utils;
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
    const columns = this.definitions.createColumnDefinitions(definition);
    const foreigns = this.definitions.createForeignKeys(definition, this.prefix);
    const uniques = this.definitions.createUniqueKeys(definition);
    const query = `CREATE TABLE ${this.prefix}${tableName} (${columns}${foreigns}${uniques});`;
    await this.connection.execute(query);
  }
}
