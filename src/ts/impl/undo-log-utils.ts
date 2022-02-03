import { Row } from "../tables";
import { Connection, TableDefinition, SqliteColumnDefinition, ForeignKey, PragmaTableInfo, TableColumn, UndoLogError, UndoLogOptions } from "../types";

export class UndoLogUtils {
  private connection: Connection;
  private prefix: string;
  constructor(connection: Connection, options?: UndoLogOptions) {
    const opts = Object.assign({ debug: false, prefix: "undo_" }, options);
    this.connection = connection;
    this.prefix = opts.prefix;
  }

  async createTable(tableName: string, definition: TableDefinition) {
    const columns = Object.getOwnPropertyNames(definition.columns).map((n) => {
      const xxx = definition.columns[n];
      const def =
        typeof xxx == "string"
          ? { type: xxx }
          : (xxx as SqliteColumnDefinition);
      const pk = definition.primaryKey.indexOf(n) > -1;
      const ai = pk ? "PRIMARY KEY AUTOINCREMENT" : "";
      const nn = !pk && def.canBeNull === false;
      const ch = def.check != null ? `CHECK(${def.check})` : "";
      return `${n} ${def.type} ${!pk ? (nn ? "NOT NULL" : "NULL") : ai} ${ch}`;
    });
    const foreignFunc = (n: string, f: ForeignKey) =>
      `FOREIGN KEY(${n}) REFERENCES ${this.prefix}${f.referencedTable}(${
        f.column
      }) ${
        f.onDelete === "CASCADE"
          ? "ON DELETE CASCADE"
          : f.onDelete === "SET_NULL"
          ? "ON DELETE SET NULL"
          : ""
      }`;
    const foreigns =
      definition.foreignKeys != null
        ? "," +
          Object.getOwnPropertyNames(definition.foreignKeys)
            .map((fk) => {
              return foreignFunc(fk, definition.foreignKeys![fk]);
            })
            .join(", ")
        : "";
    const uniques =
      definition.uniques != null
        ? "," +
          definition.uniques.map((x) => `UNIQUE (${x.join(", ")})`).join(", ")
        : "";
    const query = `CREATE TABLE ${this.prefix}${tableName} (${columns}${foreigns}${uniques});`;
    await this.connection.execute(query);
  }

  async dropTable(tableName: string) {
    const query = `DROP TABLE ${tableName}`;
    await this.connection.execute(query);
  }

  async createChannel(channel: number) {
    const parameters = { $channel: channel };
    await this.connection.run(
      `INSERT OR IGNORE INTO ${this.prefix}channels (id, status) VALUES ($channel, 'READY')`,
      parameters
    );
    const row = await this.connection.getSingle<Row.Channel>(
      `SELECT * FROM ${this.prefix}channels`
    );
    if (row == null) {
      throw new UndoLogError(`Unable to create or get a channel '${channel}'.`);
    }
    return row;
  }

  async updateChannel(channel: number, status: Row.Channel["status"]) {
    const parameters = { $channel: channel, $status: status };
    await this.connection.run(
      `UPDATE ${this.prefix}channels SET status=$status WHERE id=$channel`,
      parameters
    );
  }

  cellToString(value: any) {
    if (value == null) {
      return null;
    }
    if (value instanceof Buffer) {
      value = (value as Buffer).toLocaleString();
    }
    return this.connection.escapeString(value.toString());
  }

  async insertIntoTable(name: string, row: Record<string, any>) {
    const columns = Object.getOwnPropertyNames(row).join(", ");
    const values = Object.getOwnPropertyNames(row)
      .map((n) => this.cellToString(row[n]))
      .join(", ");
    const query = `INSERT INTO ${name} (${columns}) VALUES  (${values})`;
    await this.connection.run(query);
  }

  async getMetaTable(name: string) {
    const cleanName = name.replace("'", "");
    const query = `SELECT * FROM pragma_table_info('${cleanName}')`;
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

  async doesTableExist(name: string) {
    const query =
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name=@name";
    const parameters = { "@name": name };
    const row = await this.connection.getSingle(query, parameters);
    return row != null;
  }

  async hasTableId(name: string, id: number) {
    const query = "SELECT 1 FROM ${name} WHERE id=$id";
    const parameters = { $id: id };
    const row = await this.connection.getSingle(query, parameters);
    return row != null;
  }
}
