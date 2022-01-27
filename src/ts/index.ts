import { Connection } from "./types";
import { readFileSync } from "fs";
import { join } from "path";
import { getMetaTable } from "./utils";

export async function install(connection: Connection) {
  const installScript = readFileSync(
    join(__dirname, "..", "sql", "create_tables.sql")
  ).toString();
  await connection.execute(installScript);
}

export async function setupTable(connection: Connection, name: string) {
  const columns = await getMetaTable(connection, name);
 
}