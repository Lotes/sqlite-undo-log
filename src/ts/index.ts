import { Connection } from "./types";
import { readFileSync } from "fs";
import { join } from "path";
import { getMetaTable as queryMetaTable, TableColumn } from "./utils";

const Variable_CurrentActionId = 0;
const Variable_CurrentOrderIndex = 1;
const Variable_CurrentChangeId = 2;

export interface UndoLogSetup {
  install(): Promise<void>;
  uninstall(): Promise<void>;
  addTable(name: string, channel: number): Promise<void>;
  updateTable(name: string, channel?: number): Promise<void>;
  removeTable(name: string): Promise<void>;
}

export interface UndoLog {
  beginAction(categoryName: string): Promise<number>;
  endAction(): Promise<void>;
  undo(channel: number): Promise<void>;
  redo(channel: number): Promise<void>;
}

export class UndoLogSetupImpl implements UndoLogSetup {
  private connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;  
  }
  async install(): Promise<void> {
    const installScript = readFileSync(
      join(__dirname, "..", "sql", "create_tables.sql")
    ).toString();
    await this.connection.execute(installScript);
  }
  uninstall(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async addTable(name: string, channel: number): Promise<void> {
    await this.createChannel(channel);
    const tableId = await this.createTable(name, channel);
    const columns = await this.createColumns(tableId, name);    
    await this.createInsertTrigger(name, columns);
  }
  async createColumns(tableId: number, tableName: string) {
    const columns = await queryMetaTable(this.connection, tableName);
    const keyTable = "$table";
    let parameters: Record<string, string|number> = {[keyTable]: tableId};
    const dataStrings: string[] = [];
    columns.forEach(c => {
      const keyId = `\$id${c.id}`;
      const keyName = `\$name${c.id}`;
      const keyType = `\$type${c.id}`;
      parameters = {
        ...parameters,
        [keyId]: c.id,
        [keyName]: c.name,
        [keyType]: c.type
      };
      dataStrings.push(`(${keyId},${keyTable},${keyName},${keyType})`);
    });
    const query = `INSERT INTO undo_columns (id, table_id, name, type) VALUES ${dataStrings.join(", ")}`;
    await this.connection.run(query, parameters);
    return columns;
  }
  async createChannel(channel: number) {
    const query = "INSERT OR IGNORE INTO undo_channels (id, action_id) VALUES ($channel, NULL)";
    const parameters = {"$channel": channel};
    await this.connection.run(query, parameters);
  }
  async createTable(name: string, channel: number) {
    const query = "INSERT INTO undo_tables (name, channel_id) VALUES ($name, $channel)";
    const parameters = {
      "$name": name,
      "$channel": channel
    };
    return (await this.connection.run(query, parameters)).lastID!;
  }
  async createInsertTrigger(name: string, columns: TableColumn[]) {
    const query = `
CREATE TRIGGER undo_log_insertion_${name}_trigger
  AFTER INSERT ON ${name}
  FOR EACH ROW
BEGIN
  PRAGMA temp_store = 2;
  CREATE TEMP TABLE variables(
    name INTEGER PRIMARY KEY,
    value INTEGER NULL
  );
  --currentActionId := channel.action.id
  INSERT INTO variables (name, value)
    SELECT ${Variable_CurrentActionId}, action_id
    FROM undo_tables
    WHERE name=${this.connection.escapeString(name)};
  --currentOrderIndex := MAX(change.orderIndex where change.action.id = channel.action.id)+1
  INSERT INTO variables (name, value)
    SELECT ${Variable_CurrentOrderIndex}, MAX(ch.order_index) + 1
    FROM undo_changes ch INNER JOIN variables v
    ON (v.name=${Variable_CurrentActionId} AND ch.action_id=v.value);
  --+=new Change(INSERT, rowid, currentActionId, currentOrderIndex)
  INSERT INTO undo_changes (type, row_id, action_id, order_index)
    SELECT 'INSERT', NEW.rowid, (${this.queryVariable(Variable_CurrentActionId)}), (${this.queryVariable(Variable_CurrentOrderIndex)});
  --currentChangeId := last-row-id
  INSERT INTO variables (name, value)
    SELECT ${Variable_CurrentChangeId}, last_insert_rowid();
  --save column values
  INSERT INTO undo_values (column_id, change_id, new_value)
    ${columns.map(c =>
      `SELECT
        (${this.queryColumn(name, c.name)}),
        (${this.queryVariable(Variable_CurrentChangeId)}),
        NEW.${c.name}`
    ).join(" UNION ")};
END;`;
    await this.connection.execute(query);
  }
  updateTable(name: string, channel?: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async removeTable(name: string): Promise<void> {
    await this.connection.run("DELETE FROM undo_tables WHERE id=$name", {"$name": name});
  }

  private queryVariable(name: number): string {
    return "SELECT value FROM variables WHERE name = "+name;
  }
  private queryColumn(table: string, column: string): string {
    return `
    SELECT id
      FROM undo_columns c
        INNER JOIN undo_tables t 
        ON c.table_id=t.id
      WHERE t.name=${this.connection.escapeString(table)}
        AND c.name=${this.connection.escapeString(column)}
    `;
  }
}

export class UndoLogImpl implements UndoLog {
  beginAction(categoryName: string): Promise<number> {
    throw new Error("Method not implemented.");
  }
  endAction(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  undo(channel: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  redo(channel: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

}