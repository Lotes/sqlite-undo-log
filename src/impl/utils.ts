import { unreachableCase } from "ts-assert-unreachable";
import { Connection, Parameters } from "../sqlite3";
import {
  TableColumn,
  TableDefinition,
  ForeignKey
} from "../tables";
import { UndoLogError } from "../undo-log";
import { ColumnValue, Utils } from "../utils";

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
  toParameterList<T extends Record<string, any>>(
    data: Partial<T>
  ): [Parameters, string[]] {
    let tail: string[] = [];
    let parameters = {};
    Object.getOwnPropertyNames(data).forEach((c) => {
      tail.push(`${c}=$${c}`);
      parameters = { ...parameters, [`$${c}`]: data[c] };
    });
    return [parameters, tail];
  }
  async updateTable<T extends Record<string, any>>(
    tableName: string,
    rowid: number,
    data: Partial<T>
  ): Promise<void> {
    let [parameters, tail] = this.toParameterList({
      ...data,
      rowid,
    });
    const query = `UPDATE ${tableName} SET ${tail.join(
      ", "
    )} WHERE rowid=$rowid`;
    await this.connection.run(query, parameters);
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
    await this.connection.run(query, parameters);
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
  protected createUniqueKeys(definition: TableDefinition) {
    return definition.uniques != null
      ? "," +
          definition.uniques.map((x) => `UNIQUE (${x.join(", ")})`).join(", ")
      : "";
  }

  protected createForeignKeys(definition: TableDefinition, prefix: string) {
    function createOnDelete(f: ForeignKey) {
      switch(f.onDelete) {
        case "CASCADE": return "ON DELETE CASCADE";
        case "SET_NULL": return "ON DELETE SET NULL";
        default: return "";
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

  protected createColumnDefinitions(definition: TableDefinition) {
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

  async doesTableExist(name: string) {
    const query =
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name=$name";
    const parameters = { $name: name };
    const row = await this.connection.getSingle(query, parameters);
    return row != null;
  }
  async hasTableId(name: string, id: number) {
    return (await this.tableHas(name, { id }))[0];
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
      if (!this.equals(expected[n], actual[n])) {
        errors.push(
          `Expected table '${tableName}' to have a row with the property '${n}' set to '${expected[n]}', but '${actual[n]}' was given.`
        );
      }
    });
    return [errors.length === 0, errors];
  }

  async deleteFromTable(tableName: string, id: number): Promise<void> {
    const query = `DELETE FROM ${tableName} WHERE id=$id`;
    const parameters = { $id: id };
    await this.connection.run(query, parameters);
  }

  normalize(arg: any): any {
    if (typeof arg === "string") {
      if (/^\d+(\.\d+)?$/.test(arg)) {
        return parseFloat(arg);
      }
      const asStringLiteral = /^'([^']*)'$/gi.exec(arg);
      if (asStringLiteral != null) {
        return asStringLiteral[1].substr(1, asStringLiteral[1].length - 2);
      }
      const asBufferLiteral = /^X'([0-9A-F]+)'$/gi.exec(arg);
      if (asBufferLiteral != null) {
        return Buffer.from(asBufferLiteral[1], "hex");
      }
    }
    return arg;
  }

  equals(left: any, right: any) {
    const lhs = this.normalize(left);
    const rhs = this.normalize(right);
    if (lhs instanceof Buffer && rhs instanceof Buffer) {
      return lhs.equals(rhs);
    }
    return lhs == rhs;
  }

  unquote(values: Record<string, ColumnValue>): Record<string, any> {
    let result: Record<string, any> = {};
    Object.entries(values).forEach((entry) => {
      const [name, { value, type }] = entry;
      switch (type) {
        case "TEXT":
          result = { ...result, [name]: this.unquoteText(value) };
          break;
        case "REAL":
          result = { ...result, [name]: parseFloat(value) };
          break;
        case "NUMERIC":
          result = { ...result, [name]: parseFloat(value) };
          break;
        case "INTEGER":
          result = { ...result, [name]: parseInt(value) };
          break;
        case "BLOB":
          result = { ...result, [name]: this.unquoteBlob(value) };
          break;
        default:
          unreachableCase(type, `Unknown type '${type}' for unquoting.`);
      }
    });
    return result;
  }
  private unquoteBlob(value: string): Buffer {
    const matchHex = /^X'([^']+)'$/.exec(value);
    if (matchHex != null) {
      return Buffer.from(matchHex[1], "hex");
    }
    if (/^('[.+]')$/.test(value)) {
      return Buffer.from(this.unquoteText(value));
    }
    throw new UndoLogError("Unable to unquote blob!");
  }
  private unquoteText(value: string): string {
    return value.substr(1, value.length - 2).replace(/''/g, "'");
  }
}
