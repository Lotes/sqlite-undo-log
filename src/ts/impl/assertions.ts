import { Assertions, UndoLogUtils } from "../types";

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class AssertionsImpl implements Assertions {
  private debug: boolean;
  private utils: UndoLogUtils;
  constructor(utils: UndoLogUtils, debug: boolean) {
    this.utils = utils;
    this.debug = debug;
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
    if (!this.debug) {
      return;
    }
    const result = await this.utils.doesTableExist(tableName);
    this.assertTrue(result, `Expected table '${tableName}', but was not found.`);
  }
  async assertTableDoesNotExist(tableName: string) {
    if (!this.debug) {
      return;
    }
    const result = await this.utils.doesTableExist(tableName);
    this.assertFalse(
      result,
      `Expected table '${tableName}' to be gone, but was found.`
    );
  }

  async assertTableHasId(tableName: string, id: number) {
    if (!this.debug) {
      return;
    }
    const result = await this.utils.hasTableId(tableName, id);
    this.assertTrue(
      result,
      `Expected table '${tableName}' to have entry with id ${id}, but was not found.`
    );
  }  
}