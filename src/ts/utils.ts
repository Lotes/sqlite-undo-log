import { Connection, TableDefinition } from "./types";

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

export async function createTable(connection: Connection, name: string, definition: TableDefinition) {
    const columns = Object.getOwnPropertyNames(definition)
                          .map(n => `${n} ${definition[n]} ${n==="id" ? "PRIMARY KEY" : "NULL"}`)
                          .join(", ")
    const query = `CREATE TABLE ${name} (${columns})`
    await connection.run(query);
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