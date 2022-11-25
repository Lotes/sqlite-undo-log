import { AssertionError, Assertions } from "../assertions";
import { Utils } from "../utilities";

export class AssertionsImpl implements Assertions {
  private utils: Utils;
  constructor(utils: Utils) {
    this.utils = utils;
  }

  async assertColumnExists(
    tableName: string,
    columnName: string
  ): Promise<void> {
    const exists = await this.utils.doesColumnExist(tableName, columnName);
    this.assertTrue(
      exists,
      `Expected column '${tableName}.${columnName}' was not found.`
    );
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
    this.assertTrue(
      result,
      `Expected table '${tableName}', but was not found.`
    );
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

  async assertTableHasNoId(tableName: string, id: number): Promise<void> {
    const result = await this.utils.hasTableId(tableName, id);
    this.assertFalse(
      result,
      `Expected table '${tableName}' to NOT have entry with id ${id}, but was found.`
    );
  }

  async assertTableHas<T extends Record<string, any> & { id: number }>(
    tableName: string,
    row: T
  ) {
    const [result, errors] = await this.utils.tableHas(tableName, row);
    this.assertTrue(
      result,
      errors.join("\r\n")
    );
  }
}
