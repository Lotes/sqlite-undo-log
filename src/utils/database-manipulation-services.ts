export interface DatabaseManipulationServices {
  updateTable<T extends Record<string, any>>(
    tableName: string,
    rowid: number,
    data: Partial<T>
  ): Promise<void>;
  insertIntoTable<T extends Record<string, any>>(
    name: string,
    row: T
  ): Promise<number>;
  insertBlindlyIntoTable<T extends Record<string, any>, I extends keyof T>(
    name: string,
    row: Omit<T, I>
  ): Promise<number>;
  deleteFromTable(tableName: string, id: number): Promise<void>;
}
