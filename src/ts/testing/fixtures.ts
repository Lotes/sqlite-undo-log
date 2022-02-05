import { TableDefinition } from "../types";

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