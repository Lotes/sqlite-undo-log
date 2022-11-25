import { TableDefinition } from "../undo-log-tables";


export interface SetupServices {
  createUndoLogTable(
    tableName: string,
    definition: TableDefinition
  ): Promise<void>;
  updateUndoLogTable<T extends Record<string, any> & { id: number; }>(
    tableName: string,
    data: Partial<T> & { id: number; }
  ): Promise<void>;
}
