import { Connection } from "../types";
import { createTable, getMetaTable, TableColumn } from "../utils";
import { UndoLog, UndoLogSetup } from "../undo-log";
import tables, { tableOrder } from "../tables";

const Variable_CurrentActionId = 0;
const Variable_CurrentOrderIndex = 1;
const Variable_CurrentChangeId = 2;

export class UndoLogSetupImpl implements UndoLogSetup {
  private connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;
  }
  async install(): Promise<void> {
    for(const n of tableOrder) {
      await createTable(this.connection, n, tables[n], "undo_");
    }
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
    const columns = await getMetaTable(this.connection, tableName);
    const keyTable = "$table";
    let parameters: Record<string, string | number> = { [keyTable]: tableId };
    const dataStrings: string[] = [];
    columns.forEach((c) => {
      const keyId = `\$id${c.id}`;
      const keyName = `\$name${c.id}`;
      const keyType = `\$type${c.id}`;
      parameters = {
        ...parameters,
        [keyId]: c.id,
        [keyName]: c.name,
        [keyType]: c.type,
      };
      dataStrings.push(`(${keyId},${keyTable},${keyName},${keyType})`);
    });
    const query = `INSERT INTO undo_columns (id, table_id, name, type) VALUES ${dataStrings.join(
      ", "
    )}`;
    await this.connection.run(query, parameters);
    return columns;
  }
  async createChannel(channel: number) {
    const query =
      "INSERT OR IGNORE INTO undo_channels (id, action_id) VALUES ($channel, NULL)";
    const parameters = { $channel: channel };
    await this.connection.run(query, parameters);
  }
  async createTable(name: string, channel: number) {
    const query =
      "INSERT INTO undo_tables (name, channel_id) VALUES ($name, $channel)";
    const parameters = {
      $name: name,
      $channel: channel,
    };
    return (await this.connection.run(query, parameters)).lastID!;
  }
  async createInsertTrigger(name: string, columns: TableColumn[]) {
    const query = `
  CREATE TRIGGER undo_log_insertion_${name}_trigger
    AFTER INSERT ON ${name}
    FOR EACH ROW
  BEGIN
    INSERT INTO undo_changes (type, row_id, action_id, order_index)
      SELECT 'INSERT', 123, ch.action_id, MAX(IFNULL(c.order_index,0))+1 AS order_index
      FROM undo_tables t
        INNER JOIN undo_channels ch ON t.channel_id=ch.id
        LEFT JOIN undo_changes c ON ch.action_id=c.action_id
      WHERE t.name='persons'
      GROUP BY ch.action_id;

    INSERT INTO undo_values (column_id, change_id, new_value)
      ${columns.map((c) => `SELECT ${c.id}, last_insert_rowid(), NEW.${c.name}`).join(" UNION ")};
  END;`;
    await this.connection.execute(query);
  }
  updateTable(name: string, channel?: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async removeTable(name: string): Promise<void> {
    await this.connection.run("DELETE FROM undo_tables WHERE id=$name", {
      $name: name,
    });
  }

  private queryVariable(name: number): string {
    return "SELECT value FROM variables WHERE name = " + name;
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
