import { UndoLogServices } from "../..";
import { ForeignKey, TableColumn, TableDefinition } from "../../undo-log-tables";
import { DatabaseDefinitionServices } from "../../utils/database-definition-services";
import { PragmaTableInfo } from "../../utils/types";
import { Connection } from "c:/Users/markh/Documents/GitHub/sqlite-undo-log/src/sqlite3";

export class DatabaseDefinitionServicesImpl implements DatabaseDefinitionServices {
  private connection: Connection;

  constructor(srv: UndoLogServices) {
    this.connection = srv.connection;
  }

  async getAllTableNames(): Promise<string[]> {
    const query = `
      SELECT name
      FROM sqlite_schema
      WHERE type ='table' AND name NOT LIKE 'sqlite_%'
    `;
    const rows = await this.connection.getAll<{ name: string }>(query);
    return rows.map((r) => r.name);
  }

  async doesTableExist(name: string) {
    const query =
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name=$name";
    const parameters = { $name: name };
    const row = await this.connection.getSingle(query, parameters);
    return row != null;
  }

  createColumnDefinitions(definition: TableDefinition) {
    return Object.getOwnPropertyNames(definition.columns).map((n) => {
      const column = definition.columns[n];
      const def = typeof column == "string" ? { type: column } : column;
      const pk = definition.primaryKey.indexOf(n) > -1;
      const ai = pk ? "PRIMARY KEY AUTOINCREMENT" : "";
      const nn = !pk && def.canBeNull === false;
      const ch = def.check != null ? `CHECK(${def.check})` : "";
      const nll = nn ? "NOT NULL" : "NULL";
      const cl = !pk ? nll : ai;
      return `${n} ${def.type} ${cl} ${ch}`;
    });
  }

  createForeignKeys(definition: TableDefinition, prefix: string) {
    function createOnDelete(f: ForeignKey) {
      switch (f.onDelete) {
        case "CASCADE":
          return "ON DELETE CASCADE";
        case "SET_NULL":
          return "ON DELETE SET NULL";
        default:
          return "";
      }
    }
    const foreignFunc = (n: string, f: ForeignKey) =>
      `FOREIGN KEY(${n}) REFERENCES ${prefix}${f.referencedTable}(${
        f.column
      }) ${createOnDelete(f)}`;
    return definition.foreignKeys != null
      ? "," +
          Object.getOwnPropertyNames(definition.foreignKeys)
            .map((fk) => {
              return foreignFunc(fk, definition.foreignKeys![fk]);
            })
            .join(", ")
      : "";
  }

  async getMetaTable(name: string) {
    const cleanName = this.connection.escapeString(name);
    const query = `SELECT * FROM pragma_table_info(${cleanName})`;
    const columns = await this.connection.getAll<PragmaTableInfo>(query);
    return columns.map<TableColumn>((pti) => {
      return {
        defaultValue: pti.dflt_value,
        id: pti.cid,
        isPrimaryKey: pti.pk === 1,
        name: pti.name,
        type: pti.type,
        canBeNull: pti.notnull === 0,
      };
    });
  }

  async createTable(
    tableName: string,
    definition: TableDefinition
  ): Promise<void> {
    const columns = this.createColumnDefinitions(definition);
    const foreigns = this.createForeignKeys(definition, "");
    const uniques = this.createUniqueKeys(definition);
    const query = `CREATE TABLE ${tableName} (${columns}${foreigns}${uniques});`;
    await this.connection.execute(query);
  }
  createUniqueKeys(definition: TableDefinition) {
    return definition.uniques != null
      ? "," +
          definition.uniques.map((x) => `UNIQUE (${x.join(", ")})`).join(", ")
      : "";
  } 

  async doesColumnExist(
    tableName: string,
    columnName: string
  ): Promise<boolean> {
    const columns = await this.getMetaTable(tableName);
    return (
      columns.findIndex(
        (c) => c.name.toLowerCase() === columnName.toLowerCase()
      ) > -1
    );
  }
}