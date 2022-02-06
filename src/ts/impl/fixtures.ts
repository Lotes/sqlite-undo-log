import { promises } from "fs";
import path from "path";
import { Database, TableDefinition } from "../types";
import { AssertionsImpl } from "./assertions";
import { DatabaseImpl } from "./sqlite3";
import { UndoLogImpl } from "./undo-log";
import { UndoLogSetupImpl } from "./undo-log-setup";
import { UndoLogUtilsImpl } from "./undo-log-utils";

export namespace AllTypeTable {
    export const Definition: TableDefinition = {
        primaryKey: ["id"],
        columns: {
            id: "INTEGER",
            name: "TEXT",
            num: "NUMERIC",
            blob: "BLOB",
            zero: "REAL"
        }        
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
            zero: 0
        }
    ]
}

export async function setupBeforeAll() {
  await promises.rm("output", {recursive: true});
  await promises.mkdir("output");
}

export async function setupBeforeEach() {
    const fileName = path.join("output", expect.getState().currentTestName.replace(/\s+/g, "_") + ".sqlite3");
    const database: Database = new DatabaseImpl(fileName);
    const connection = await database.connect();
    const utils = new UndoLogUtilsImpl(connection)
    const setup = new UndoLogSetupImpl(connection, utils);
    const log = new UndoLogImpl(connection, utils);
    const assertions = new AssertionsImpl(utils);
    return {
        connection,
        utils,
        setup,
        log,
        assertions
    };
}