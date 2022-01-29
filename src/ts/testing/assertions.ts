import {Connection} from "../types";

export async function doesTableExist(connection: Connection, name: string) {
    const query = "SELECT 1 FROM sqlite_master WHERE type='table' AND name=@name";
    const parameters = { "@name": name };
    const row = await connection.getSingle(query, parameters);
    return row != null;
}