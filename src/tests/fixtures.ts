import { promises } from "fs";
import path from "path";
import { DatabaseImpl } from "../impl/sqlite3";
import { SqliteType, TableDefinition } from "../tables";
import { createTestServices } from "..";

export namespace AllTypeTable {
  export const Definition: TableDefinition = {
    name: "all_types",
    primaryKey: ["id"],
    columns: {
      id: "INTEGER",
      name: "TEXT",
      num: "NUMERIC",
      blob: "BLOB",
      zero: "REAL",
    },
  };
  export interface Row {
    id: number;
    name: string;
    num: number;
    blob: Buffer;
    zero: number;
  }
  export const Values: Row[] = [
    {
      id: 1,
      blob: Buffer.from("juan"),
      name: "one",
      num: 1,
      zero: 0,
    },
  ];
}

export async function setupBeforeAll() {
  await promises.rm("output", {
    recursive: true,
    force: true,
  });
  await promises.mkdir("output");
}

export async function setupBeforeEach() {
  const fileName = path.join(
    "output",
    expect.getState().currentTestName.replace(/\s+/g, "_") + ".sqlite3"
  );
  const database = new DatabaseImpl(fileName, true);
  const connection = await database.connect();
  return createTestServices(connection, 'undo_');
}

export const TableDefintion_OnlyOneType: (
  type: SqliteType
) => TableDefinition = (type: SqliteType) => ({
  name: `${type}_only`,
  primaryKey: ["id"],
  columns: {
    id: "INTEGER",
    col: type,
  },
});
