import { TableColumn, TableDefinition } from "../undo-log-tables";
import { Parameters } from "../sqlite3";

export interface DatabaseDefinitionServices {
  createTable(tableName: string, tableDef: TableDefinition): Promise<void>;
  doesColumnExist(tableName: string, columnName: string): Promise<boolean>;
  getMetaTable(name: string): Promise<TableColumn[]>;
  createUniqueKeys(definition: TableDefinition): string;
  createForeignKeys(definition: TableDefinition, prefix: string): string;
  createColumnDefinitions(definition: TableDefinition): string[];
  getAllTableNames(): Promise<string[]>;
  doesTableExist(name: string): Promise<boolean>;
}
