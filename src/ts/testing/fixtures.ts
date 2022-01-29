import { TableDefinition } from "../types";

export namespace AllTypeTable {
    export const Definition: TableDefinition = {
        id: "REAL",
        name: "TEXT",
        num: "NUMERIC",
        blob: "BLOB",
        zero: "NULL"
    };
    export interface Row {
        id: number,
        name: string,
        num: number,
        blob: Buffer,
        zero: null
    }
    export const Values: Row[] = [
        {
            id: 1,
            blob: Buffer.from("juan"),
            name: "one",
            num: 1,
            zero: null
        }
    ]
}