import { Connection, Parameters } from "../sqlite3";
import { TableColumn, TableDefinition, ForeignKey, SqliteColumnDefinition } from "../tables";
import { Utils } from "../utils";

export interface PragmaTableInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string;
  pk: number;
}

export class UtilsImpl implements Utils {
    protected connection: Connection;
    constructor(connection: Connection) {
      this.connection = connection;
    }
    toParameterList<T extends Record<string, any>>(data: Partial<T>):[Parameters, string[]] {
      let tail: string[] = [];
      let parameters = {};
      Object.getOwnPropertyNames(data).forEach(c => {
        tail.push(`${c}=$${c}`);
        parameters = {...parameters, [`$${c}`]: data[c] };
      });
      return [parameters, tail];
    }
    async updateTable<T extends Record<string, any>>(tableName: string, rowid: number, data: Partial<T>): Promise<void> {
      let [parameters, tail] = this.toParameterList({
        ...data,
        rowid
      })
      const query = `UPDATE ${tableName} SET ${tail.join(", ")} WHERE rowid=$rowid`;
      await this.connection.run(query, parameters);
    }
    
    async doesColumnExist(tableName: string, columnName: string): Promise<boolean> {
      const columns = await this.getMetaTable(tableName);
      return columns.findIndex(c => c.name.toLowerCase() === columnName.toLowerCase()) > -1;
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
  
    async createTable(tableName: string, definition: TableDefinition): Promise<void> {
      const columns = this.createColumnDefinitions(definition);
      const foreigns = this.createForeignKeys(definition, "");
      const uniques = this.createUniqueKeys(definition);
      const query = `CREATE TABLE ${tableName} (${columns}${foreigns}${uniques});`;
      await this.connection.execute(query);
    }
    protected createUniqueKeys(definition: TableDefinition) {
      return definition.uniques != null
        ? "," +
        definition.uniques.map((x) => `UNIQUE (${x.join(", ")})`).join(", ")
        : "";
    }
  
    protected createForeignKeys(definition: TableDefinition, prefix: string) {
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
  
    protected createColumnDefinitions(definition: TableDefinition) {
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
  
    async doesTableExist(name: string) {
      const query = "SELECT 1 FROM sqlite_master WHERE type='table' AND name=$name";
      const parameters = { "$name": name };
      const row = await this.connection.getSingle(query, parameters);
      return row != null;
    }
    async hasTableId(name: string, id: number) {
      return await this.tableHas(name, {id});
    }
    async tableHas<T extends Record<string, any> & { id: number; }>(tableName: string, row: T): Promise<boolean> {
      const [parameters, tail] = this.toParameterList(row);
      const query = `SELECT 1 AS yes FROM ${tableName} WHERE ${tail.join(" AND ")}`;
      return await this.connection.getSingle<{yes: boolean}>(query, parameters) != null;
    }
  }
  