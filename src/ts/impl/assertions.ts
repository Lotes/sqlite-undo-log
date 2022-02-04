import { Assertions, UndoLogUtils } from "../types";

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class AssertionsImpl implements Assertions {
  private utils: UndoLogUtils;
  constructor(utils: UndoLogUtils) {
    this.utils = utils;
  }
  async assertColumnExists(tableName: string, columnName: string): Promise<void> {
    const exists = await this.utils.doesColumnExist(tableName, columnName);
    this.assertTrue(exists, `Expected column '${tableName}.${columnName}' was not found.`);
  }
  assertTrue(value: boolean, message: string) {
    if (!value) {
      throw new AssertionError(message);
    }
  }
  assertFalse(value: boolean, message: string) {
    this.assertTrue(!value, message);
  }
  async assertTableExists(tableName: string) {
    const result = await this.utils.doesTableExist(tableName);
    this.assertTrue(result, `Expected table '${tableName}', but was not found.`);
  }
  async assertTableDoesNotExist(tableName: string) {
    const result = await this.utils.doesTableExist(tableName);
    this.assertFalse(
      result,
      `Expected table '${tableName}' to be gone, but was found.`
    );
  }

  async assertTableHasId(tableName: string, id: number) {
    const result = await this.utils.hasTableId(tableName, id);
    this.assertTrue(
      result,
      `Expected table '${tableName}' to have entry with id ${id}, but was not found.`
    );
  }
  
  async assertTableHas<T extends Record<string, any> & {id: number}>(tableName: string, row: T) {
    const result = await this.utils.tableHas(tableName, row);
    this.assertTrue(
      result,
      `Expected table '${tableName}' to have entry with ${JSON.stringify(row)}.`
    );
  }
}