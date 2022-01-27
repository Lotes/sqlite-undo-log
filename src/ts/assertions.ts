import {Connection} from "./types";

export async function assertTableExists(connection: Connection, name: string) {
    const query = "SELECT 1 FROM sqlite_master WHERE type='table' AND name=@name";
    const parameters = { "@name": name };
    const row = await connection.getSingle(query, parameters);
    expect(row).not.toBeNull();
}