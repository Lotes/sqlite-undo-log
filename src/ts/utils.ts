import { Connection, ForeignKey, SqliteColumnDefinition, TableDefinition } from "./types";

export interface TableColumn {
    id: number;
    name: string;
    type: string;
    canBeNull?: boolean;
    defaultValue: string|null;
    isPrimaryKey: boolean;
}

interface PragmaTableInfo {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: string;
    pk: number;
}

export async function getMetaTable(connection: Connection, name: string) {
    const cleanName = name.replace("'", "");
    const query = `SELECT * FROM pragma_table_info('${cleanName}')`;
    const columns = await connection.getAll<PragmaTableInfo>(query);
    return columns.map<TableColumn>(pti => {
        return {
            defaultValue: pti.dflt_value,
            id: pti.cid,
            isPrimaryKey: pti.pk === 1,
            name: pti.name,
            type: pti.type,
            canBeNull: pti.notnull === 0
        };
    });
}

export async function createTable(connection: Connection, name: string, definition: TableDefinition, prefix: string = "") {
    const columns = Object.getOwnPropertyNames(definition.columns)
                            .map(n => {
                                const xxx = definition.columns[n]
                                const def = typeof(xxx) == "string" ? {type: xxx} : xxx as SqliteColumnDefinition;
                                const pk = definition.primaryKey.indexOf(n) > -1;
                                const nn = !pk && def.canBeNull === false;
                                const ch = def.check != null ? `CHECK(${def.check})` : "";
                                return `${n} ${def.type} ${nn ? "NOT NULL" : "NULL"} ${ch}`;
                            })
    const primary = definition.primaryKey.length > 0 &&`PRIMARY KEY (${definition.primaryKey.join(", ")})`;
    const foreignFunc = (n: string, f: ForeignKey) => `FOREIGN KEY(${n}) REFERENCES ${prefix}${f.referencedTable}(${f.column}) ${
        f.onDelete === "CASCADE" ? "ON DELETE CASCADE" : f.onDelete === "SET_NULL" ? "ON DELETE SET NULL" : ""}`;
    const foreigns = definition.foreignKeys != null ? ","+Object.getOwnPropertyNames(definition.foreignKeys).map(fk => {
        return foreignFunc(fk, definition.foreignKeys![fk]);
    }).join(", ") : "";
    const uniques = definition.uniques != null ? ","+definition.uniques.map(x => `UNIQUE (${x.join(", ")})`).join(", ") : "";
    const query = `CREATE TABLE ${prefix}${name} (${columns},${primary}${foreigns}${uniques});`;
    await connection.execute(query);
}

export async function insertIntoTable(connection: Connection, name: string, row: Record<string, any>) {
    const columns = Object.getOwnPropertyNames(row)
                         .join(", ");
    const values = Object.getOwnPropertyNames(row)
                         .map(n => `${typeof(row[n]) === "string" ? connection.escapeString(row[n]) : row[n] == null ? "NULL" : row[n]}`)
                         .join(", ");
    const query = `INSERT INTO ${name} (${columns}) VALUES  (${values})`;
    await connection.run(query);
}