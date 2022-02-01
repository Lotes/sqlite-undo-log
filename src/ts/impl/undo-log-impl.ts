import { Connection } from "../types";
import { createChannel, createTable, dropTable, getMetaTable, TableColumn, updateChannel } from "../utils";
import { UndoLog, UndoLogError, UndoLogSetup } from "../undo-log";
import tables, { Row } from "../tables";

export class UndoLogSetupImpl implements UndoLogSetup {
  private connection: Connection;
  private prefix: string;
  constructor(connection: Connection, prefix: string = "undo_") {
    this.connection = connection;
    this.prefix = prefix;
  }
  async install(): Promise<void> {
    for (const n of Object.getOwnPropertyNames(tables)) {
      await createTable(this.connection, n, tables[n], this.prefix);
    }
  }
  async uninstall(): Promise<void> {
    //TODO drop triggers
    for (const n of Object.getOwnPropertyNames(tables).reverse()) {
      await dropTable(this.connection, n, this.prefix);
    }
  }
  async addTable(name: string, channel: number): Promise<void> {
    await createChannel(this.connection, channel, this.prefix);
    const tableId = await this.createTable(name, channel);
    const columns = await this.createColumns(tableId, name);
    await this.createInsertTrigger(name, columns);
  }
  private async createColumns(tableId: number, tableName: string) {
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
    const query = `INSERT INTO ${
      this.prefix
    }columns (id, table_id, name, type) VALUES ${dataStrings.join(", ")}`;
    await this.connection.run(query, parameters);
    return columns;
  }
  private async createTable(name: string, channel: number) {
    const query = `INSERT INTO ${this.prefix}tables (name, channel_id) VALUES ($name, $channel)`;
    const parameters = {
      $name: name,
      $channel: channel,
    };
    return (await this.connection.run(query, parameters)).lastID!;
  }
  private async createInsertTrigger(name: string, columns: TableColumn[]) {
    const query = `
  CREATE TRIGGER ${this.prefix}log_insertion_${name}_trigger
    AFTER INSERT ON ${name}
    FOR EACH ROW
  BEGIN
    INSERT INTO ${this.prefix}changes (type, row_id, action_id, order_index, table_id)
      SELECT 'INSERT', NEW.rowid, ch.action_id, MAX(IFNULL(c.order_index,0))+1 AS order_index, (SELECT id FROM ${this.prefix}tables WHERE name=${this.connection.escapeString(name)})
      FROM ${this.prefix}tables t
        INNER JOIN ${this.prefix}channels ch ON t.channel_id=ch.id
        LEFT JOIN ${this.prefix}changes c ON ch.action_id=c.action_id
      WHERE t.name=${this.connection.escapeString(name)}
      GROUP BY ch.action_id;

    INSERT INTO ${this.prefix}values (column_id, change_id, new_value)
      ${columns
        .map((c) => `SELECT ${c.id}, last_insert_rowid(), NEW.${c.name}`)
        .join("\r\n      UNION ")};
  END;`;
    await this.connection.execute(query);
  }
  async removeTable(name: string): Promise<void> {
    await this.connection.run(
      `DELETE FROM ${this.prefix}tables WHERE name=$name`,
      {
        $name: name,
      }
    );
  }
}

export class UndoLogImpl implements UndoLog {
  private connection: Connection;
  private prefix: string;
  constructor(connection: Connection, prefix: string = "undo_") {
    this.connection = connection;
    this.prefix = prefix;
  }
  async next(channel: number, categoryName?: string): Promise<void> {
    const channelId = await createChannel(this.connection, channel, this.prefix);
    const categoryId = await this.getOrCreateCategory(categoryName);
    const actionId = await this.createNewAction(categoryId); 
    await updateChannel(this.connection, channelId, actionId, this.prefix);
  }
  private async createNewAction(categoryId: number | null) {
    const query = `INSERT INTO ${this.prefix}actions (created_at,category_id)VALUES(datetime('now'), $category)`;
    const parameters = { $category: categoryId };
    const run = await this.connection.run(query, parameters);
    return run.lastID!;
  }
  private async getOrCreateCategory(
    categoryName: string | undefined
  ): Promise<number | null> {
    if (categoryName != null) {
      const parameters = { $name: categoryName };
      await this.connection.run(
        `INSERT OR IGNORE INTO ${this.prefix}categories (name) VALUES ($name)`,
        parameters
      );
      const row = await this.connection.getSingle<Row.Category>(
        `SELECT id FROM ${this.prefix}categories WHERE name=$name`,
        parameters
      );
      return row!.id;
    }
    return null;
  }
  async undo(channel: number): Promise<void> {
    const query = `SELECT a.* FROM ${this.prefix}channels ch LEFT JOIN ${this.prefix}actions a ON a.id=ch.action_id WHERE ch.id=$channel`;
    const parameters = {$channel: channel};
    const row = await this.connection.getSingle<Row.Action>(query, parameters);
    if(row == null) {
      throw new UndoLogError(`No channel '${channel}' known!`);
    }
    if(row.id == null) {
      throw new UndoLogError(`Channel '${channel}' is at the bottom of the action stack.`);
    }
    await this.undoAction(row);
  }
  private async undoAction(action: Row.Action) {
    const query = `SELECT * FROM ${this.prefix}changes ch WHERE ch.action_id=$actionId ORDER BY ch.order_index DESC`;
    const parameters = {$actionId:action.id};
    const changes = await this.connection.getAll<Row.Change>(query, parameters);
    for(const change of changes) {
      await this.undoChange(change);
    }
    //TODO set channel.action_id
    //TODO undone flag
  }
  private async undoChange(change: Row.Change) {
    switch(change.type) {
      case "INSERT": await this.undoInsertion(change.table_id, change.row_id); 
    }
  }
  private async undoInsertion(tableId: number, rowId: number) {
    const query = `SELECT * FROM ${this.prefix}tables WHERE id=$id`;
    const parameters = {$id:tableId};
    const table = await this.connection.getSingle<Row.Table>(query, parameters);
    if(table == null) {
      throw new UndoLogError(`Unknown table with id '${tableId}'.`);
    }
    const run = await this.connection.run(`DELETE FROM ${table.name} WHERE rowid=$rowId`, {$rowId: rowId});
    if(run.changes == null || run.changes === 0) {
      throw new UndoLogError(`Unable to delete rowid=${rowId} in table '${table.name}'.`);
    }
  }
}
