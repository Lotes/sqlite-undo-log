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
  install(): Promise<string[]>;
  uninstall(): Promise<void>;
  enableDebugMode(enabled: boolean): Promise<void>;
  addTable(name: string, channel: number): Promise<void>;
  removeTable(name: string): Promise<void>;
  updateUndoLogTable<T extends Record<string, any> & { id: number; }>(
    tableName: string,
    data: Partial<T> & { id: number; }
  ): Promise<void>;
  createUndoLogTable(tableName: string, definition: TableDefinition): Promise<void>;

}