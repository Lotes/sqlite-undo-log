export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface Assertions {
  assertTableHas<T extends Record<string, any> & { id: number }>(
    tableName: string,
    row: T
  ): Promise<void>;
  assertTrue(value: boolean, message: string): void;
  assertFalse(value: boolean, message: string): void;
  assertTableExists(tableName: string): Promise<void>;
  assertColumnExists(tableName: string, columnName: string): Promise<void>;
  assertTableDoesNotExist(tableName: string): Promise<void>;
  assertTableHasId(tableName: string, id: number): Promise<void>;
}
