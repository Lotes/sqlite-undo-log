
export interface TableServices {
  insertIntoUndoLogTable<T extends Record<string, any>>(
    tableName: string,
    row: T
  ): Promise<number>;
  insertBlindlyIntoUndoLogTable<T extends Record<string, any>, I extends keyof T>(
    tableName: string,
    row: Omit<T, I>
  ): Promise<number>;
}
