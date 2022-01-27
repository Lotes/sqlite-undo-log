import { Connection } from "./types";

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
    const query = `SELECT cid, name, type, notnull, dflt_value, pk FROM pragma_table_info('${cleanName}')`;
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