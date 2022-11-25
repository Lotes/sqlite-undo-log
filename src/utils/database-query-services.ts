
export interface DatabaseQueryServices {
  hasTableId(name: string, id: number): Promise<boolean>;
  tableHas<T extends Record<string, any> & { id: number; }>(
    tableName: string,
    row: T
  ): Promise<[boolean, string[]]>;
}
