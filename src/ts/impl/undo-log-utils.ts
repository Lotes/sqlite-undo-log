import { Row } from "../tables";
import { Connection, TableDefinition, SqliteColumnDefinition, ForeignKey, PragmaTableInfo, TableColumn, UndoLogError, UndoLogUtils } from "../types";

export class UndoLogUtilsImpl implements UndoLogUtils {
  private connection: Connection;
  private prefix: string;
  constructor(connection: Connection, prefix: string = "undo_") {
    this.connection = connection;
    this.prefix = prefix;
  }
  async insertIntoUndoLogTable<T extends Record<string, any>>(tableName: string, row: T): Promise<void> {
    await this.insertIntoTable<T>(`${this.prefix}${tableName}`, row);
  }
  async doesColumnExist(tableName: string, columnName: string): Promise<boolean> {
    const columns = await this.getMetaTable(tableName);
    return columns.findIndex(c => c.name.toLowerCase() === columnName.toLowerCase()) > -1;
  }

  async createUndoLogTable(tableName: string, definition: TableDefinition) {
    const columns = this.createColumnDefinitions(definition);
    const foreigns = this.createForeignKeys(definition, this.prefix);
    const uniques = this.createUniqueKeys(definition);
    const query = `CREATE TABLE ${this.prefix}${tableName} (${columns}${foreigns}${uniques});`;
    await this.connection.execute(query);
  }

  private createUniqueKeys(definition: TableDefinition) {
    return definition.uniques != null
      ? "," +
      definition.uniques.map((x) => `UNIQUE (${x.join(", ")})`).join(", ")
      : "";
  }

  private createForeignKeys(definition: TableDefinition, prefix: string) {
    const foreignFunc = (n: string, f: ForeignKey) => `FOREIGN KEY(${n}) REFERENCES ${prefix}${f.referencedTable}(${f.column}) ${f.onDelete === "CASCADE"
        ? "ON DELETE CASCADE"
        : f.onDelete === "SET_NULL"
          ? "ON DELETE SET NULL"
          : ""}`;
    const foreigns = definition.foreignKeys != null
      ? "," +
      Object.getOwnPropertyNames(definition.foreignKeys)
        .map((fk) => {
          return foreignFunc(fk, definition.foreignKeys![fk]);
        })
        .join(", ")
      : "";
    return foreigns;
  }

  createColumnDefinitions(definition: TableDefinition) {
    return Object.getOwnPropertyNames(definition.columns).map((n) => {
      const xxx = definition.columns[n];
      const def = typeof xxx == "string"
        ? { type: xxx }
        : (xxx as SqliteColumnDefinition);
      const pk = definition.primaryKey.indexOf(n) > -1;
      const ai = pk ? "PRIMARY KEY AUTOINCREMENT" : "";
      const nn = !pk && def.canBeNull === false;
      const ch = def.check != null ? `CHECK(${def.check})` : "";
      return `${n} ${def.type} ${!pk ? (nn ? "NOT NULL" : "NULL") : ai} ${ch}`;
    });
  }

  async createTable(tableName: string, definition: TableDefinition): Promise<void> {
    const columns = this.createColumnDefinitions(definition);
    const foreigns = this.createForeignKeys(definition, "");
    const uniques = this.createUniqueKeys(definition);
    const query = `CREATE TABLE ${tableName} (${columns}${foreigns}${uniques});`;
    await this.connection.execute(query);
  }

  async dropUndoLogTable(tableName: string) {
    const query = `DROP TABLE ${this.prefix}${tableName}`;
    await this.connection.execute(query);
  }

  async getOrCreateReadyChannel(channel: number) {
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
    if (row.status !== "READY")  {
      throw new UndoLogError(`Expected channel '${channel}' to have status 'READY', but was '${row.status}'.`);
    }
    return row;
  }

  async updateChannel(channelId: number, status: Row.Channel["status"]) {
    const parameters = { $channel: channelId, $status: status };
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

  async insertIntoTable<T extends Record<string, any>>(name: string, row: T) {
    const columns = Object.getOwnPropertyNames(row).join(", ");
    const values = Object.getOwnPropertyNames(row)
      .map((n) => this.cellToString(row[n]))
      .join(", ");
    const query = `INSERT INTO ${name} (${columns}) VALUES (${values})`;
    await this.connection.run(query);
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

  async doesTableExist(name: string) {
    const query =
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name=@name";
    const parameters = { "@name": name };
    const row = await this.connection.getSingle(query, parameters);
    return row != null;
  }
  async hasTableId(name: string, id: number) {
    return await this.tableHas(name, {id});
  }
  async tableHas<T extends Record<string, any> & { id: number; }>(tableName: string, row: T): Promise<boolean> {
    let tail: string[] = [];
    let parameters = {};
    Object.getOwnPropertyNames(row).forEach(c => {
      tail.push(`${c}=$${c}`);
      parameters = {...parameters, [`$${c}`]: row[c] };
    });
    const query = `SELECT 1 AS yes FROM ${tableName} WHERE ${tail.join(" AND ")}`;
    return await this.connection.getSingle<{yes: boolean}>(query, parameters) != null;
  }
}
