import { Connection } from "../types";
import { createTable, getMetaTable, TableColumn } from "../utils";
import { UndoLog, UndoLogSetup } from "../undo-log";
import tables from "../tables";

export class UndoLogSetupImpl implements UndoLogSetup {
  private connection: Connection;
  private prefix: string;
  constructor(connection: Connection, prefix: string = "undo_") {
    this.connection = connection;
    this.prefix = prefix;
  }
  async install(): Promise<void> {
    for(const n of Object.getOwnPropertyNames(tables)) {
      await createTable(this.connection, n, tables[n], this.prefix);
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
    const query = `INSERT INTO ${this.prefix}columns (id, table_id, name, type) VALUES ${dataStrings.join(
      ", "
    )}`;
    await this.connection.run(query, parameters);
    return columns;
  }
  async createChannel(channel: number) {
    const query =
      `INSERT OR IGNORE INTO ${this.prefix}channels (id, action_id) VALUES ($channel, NULL)`;
    const parameters = { $channel: channel };
    await this.connection.run(query, parameters);
  }
  async createTable(name: string, channel: number) {
    const query =
      `INSERT INTO ${this.prefix}tables (name, channel_id) VALUES ($name, $channel)`;
    const parameters = {
      $name: name,
      $channel: channel,
    };
    return (await this.connection.run(query, parameters)).lastID!;
  }
  async createInsertTrigger(name: string, columns: TableColumn[]) {
    const query = `
  CREATE TRIGGER ${this.prefix}log_insertion_${name}_trigger
    AFTER INSERT ON ${name}
    FOR EACH ROW
  BEGIN
    INSERT INTO ${this.prefix}changes (type, row_id, action_id, order_index)
      SELECT 'INSERT', 123, ch.action_id, MAX(IFNULL(c.order_index,0))+1 AS order_index
      FROM ${this.prefix}tables t
        INNER JOIN ${this.prefix}channels ch ON t.channel_id=ch.id
        LEFT JOIN ${this.prefix}changes c ON ch.action_id=c.action_id
      WHERE t.name='persons'
      GROUP BY ch.action_id;

    INSERT INTO ${this.prefix}values (column_id, change_id, new_value)
      ${columns.map((c) => `SELECT ${c.id}, last_insert_rowid(), NEW.${c.name}`).join("\r\n      UNION ")};
  END;`;
    await this.connection.execute(query);
  }
  async removeTable(name: string): Promise<void> {
    await this.connection.run(`DELETE FROM ${this.prefix}tables WHERE id=$name`, {
      $name: name,
    });
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
