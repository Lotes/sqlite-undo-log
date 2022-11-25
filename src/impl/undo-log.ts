import { Action, Category, Change, Channel, Table } from "../undo-log-tables";
import { Connection } from "../sqlite3";
import { Delta, UndoLog, UndoLogError, UndoLogStatus } from "../undo-log";
import { UndoLogUtilityServices } from "../undo-log-utils";
import { Utils } from "../utils";

export class UndoLogImpl implements UndoLog {
  private connection: Connection;
  private prefix: string;
  private logUtils: UndoLogUtilityServices;
  private utils: Utils;
  constructor(
    connection: Connection,
    utils: UndoLogUtilityServices,
    prefix: string = "undo_"
  ) {
    this.connection = connection;
    this.prefix = prefix;
    this.logUtils = utils;
    this.utils = this.logUtils.utils;
  }
  async startTracking(
    channelId: number,
    categoryName?: string | undefined
  ): Promise<void> {
    await this.logUtils.channels.getOrCreateReadyChannel(channelId);
    const categoryId = await this.getOrCreateCategory(categoryName);
    await this.createNewAction(channelId, categoryId);
    await this.logUtils.channels.updateChannel(channelId, "RECORDING");
  }
  async stopTracking(channelId: number): Promise<void> {
    await this.logUtils.channels.updateChannel(channelId, "READY");
  }
  private async doItWhileChannelHasStatus<T>(
    channelId: number,
    status: Channel["status"],
    action: () => Promise<T>
  ) {
    await this.logUtils.channels.updateChannel(channelId, status);
    try {
      return await action();
    } finally {
      await this.logUtils.channels.updateChannel(channelId, "READY");
    }
  }
  private async createNewAction(channelId: number, categoryId: number | null) {
    const query = `
      INSERT INTO ${this.prefix}actions
              (created_at,      category_id, channel_id,  undone, order_index)
        SELECT datetime('now'), $categoryId, ch.id, 0,      MAX(IFNULL(a.order_index, 0))+1
          FROM ${this.prefix}channels ch
            LEFT JOIN ${this.prefix}actions a
            ON ch.id=ch.id
          WHERE ch.id=$channelId
          GROUP BY ch.id
    `;
    const parameters = {
      $categoryId: categoryId,
      $channelId: channelId,
    };
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
      const row = await this.connection.getSingle<Category>(
        `SELECT id FROM ${this.prefix}categories WHERE name=$name`,
        parameters
      );
      return row!.id;
    }
    return null;
  }
  async status(channelId: number): Promise<UndoLogStatus> {
    const channel = await this.logUtils.channels.getChannel(channelId);
    if(!channel) {
      throw new UndoLogError(`No channel ${channelId} found.`);
    }
    interface Result {
      all: number;
      redos: number;
    }
    const query = `
      SELECT
        COUNT(*) AS all,
        SUM(a.undone) AS redos
      FROM ${this.prefix}channels ch
        LEFT JOIN ${this.prefix}actions a 
          ON a.channel_id=ch.id
      WHERE ch.id=$channel
    `;
    const parameters = { $channel: channelId };
    const row = await this.connection.getSingle<Result>(query, parameters);
    if(!row) {
      return {
        redos: 0,
        status: channel.status,
        undos: 0
      }
    }
    return {
      redos: row.redos,
      undos: row.all - row.redos,
      status: channel.status
    }
  }
  async undo(channelId: number): Promise<Delta[]> {
    await this.logUtils.channels.getOrCreateReadyChannel(channelId);
    const query = `
      SELECT a.*
      FROM ${this.prefix}channels ch
        LEFT JOIN ${this.prefix}actions a 
          ON a.channel_id=ch.id
      WHERE ch.id=$channel AND a.undone=0
      ORDER BY a.order_index DESC
      LIMIT 1
    `;
    const parameters = { $channel: channelId };
    const row = await this.connection.getSingle<Action>(query, parameters);
    if (row?.id == null) {
      throw new UndoLogError(
        `Channel '${channelId}' is at the bottom of the action stack.`
      );
    }
    return await this.doItWhileChannelHasStatus(channelId, "UNDOING", () =>
      this.undoAction(row)
    );
  }
  async redo(channelId: number): Promise<Delta[]> {
    await this.logUtils.channels.getOrCreateReadyChannel(channelId);
    const query = `
      SELECT a.*
      FROM ${this.prefix}channels ch
        LEFT JOIN ${this.prefix}actions a 
          ON a.channel_id=ch.id
      WHERE ch.id=$channel AND a.undone=1
      ORDER BY a.order_index ASC
      LIMIT 1
  `;
    const parameters = { $channel: channelId };
    const row = await this.connection.getSingle<Action>(query, parameters);
    if (row?.id == null) {
      throw new UndoLogError(
        `Channel '${channelId}' has nothing to redo.`
      );
    }
    return await this.doItWhileChannelHasStatus(channelId, "RECORDING", () =>
      this.redoAction(row)
    );
  }
  private async undoAction(action: Action): Promise<Delta[]> {
    const query = `SELECT * FROM ${this.prefix}changes ch WHERE ch.action_id=$actionId ORDER BY ch.order_index DESC`;
    const parameters = { $actionId: action.id };
    const changes = await this.connection.getAll<Change>(query, parameters);
    const result: Delta[] = [];
    for (const change of changes) {
      const delta = await this.undoChange(change);
      result.push(delta);
    }
    await this.logUtils.actions.markActionAsUndone(action.id, true);
    return result;
  }
  private async redoAction(action: Action): Promise<Delta[]> {
    const query = `SELECT * FROM ${this.prefix}changes ch WHERE ch.action_id=$actionId ORDER BY ch.order_index ASC`;
    const parameters = { $actionId: action.id };
    const changes = await this.connection.getAll<Change>(query, parameters);
    const result: Delta[] = [];
    for (const change of changes) {
      const delta = await this.redoChange(change);
      result.push(delta);
    }
    await this.logUtils.actions.markActionAsUndone(action.id, false);
    return result;
  }
  private async undoChange(change: Change): Promise<Delta> {
    const query = `SELECT * FROM ${this.prefix}tables WHERE id=$id`;
    const parameters = { $id: change.table_id };
    const table = await this.connection.getSingle<Table>(query, parameters);
    if (table == null) {
      throw new UndoLogError(`Unknown table with id '${change.table_id}'.`);
    }
    switch (change.type) {
      case "INSERT":
        return await this.undoInsertion(table, change);
      case "DELETE":
        return await this.undoDeletion(table, change);
      case "UPDATE":
        return await this.undoUpdate(table, change);
    }
  }
  private async redoChange(change: Change): Promise<Delta> {
    const query = `SELECT * FROM ${this.prefix}tables WHERE id=$id`;
    const parameters = { $id: change.table_id };
    const table = await this.connection.getSingle<Table>(query, parameters);
    if (table == null) {
      throw new UndoLogError(`Unknown table with id '${change.table_id}'.`);
    }
    switch (change.type) {
      case "INSERT":
        return await this.redoInsertion(table, change);
      case "DELETE":
        return await this.redoDeletion(table, change);
      case "UPDATE":
        return await this.redoUpdate(table, change);
    }
  }
  private async undoInsertion(table: Table, change: Change): Promise<Delta> {
    const run = await this.connection.run(
      `DELETE FROM ${table.name} WHERE rowid=$rowId`,
      { $rowId: change.new_row_id }
    );
    if (run.changes == null || run.changes === 0) {
      throw new UndoLogError(
        `Unable to delete rowid=${change.new_row_id} in table '${table.name}'.`
      );
    }
    return {
      $type: "DELETE",
      $rowId: change.old_row_id,
      $tableName: table.name,
    } as Delta;
  }
  private async undoDeletion(table: Table, change: Change): Promise<Delta> {
    const values = await this.logUtils.actions.getValuesOfChange(change, "old");
    const unquotedValues = this.utils.unquote(values);
    await this.utils.insertIntoTable(table.name, unquotedValues);
    return {
      ...values,
      $type: "INSERT",
      $rowId: change.old_row_id,
      $tableName: table.name,
    } as Delta;
  }
  private async undoUpdate(table: Table, change: Change): Promise<Delta> {
    const values = await this.logUtils.actions.getValuesOfChange(change, "old");
    const unquotedValues = this.utils.unquote(values);
    await this.utils.updateTable(table.name, change.new_row_id, unquotedValues);
    return {
      ...values,
      $type: "UPDATE",
      $rowId: change.old_row_id,
      $tableName: table.name,
    } as Delta;
  }

  private async redoInsertion(table: Table, change: Change): Promise<Delta> {
    const values = await this.logUtils.actions.getValuesOfChange(change, "new");
    const unquotedValues = this.utils.unquote(values);
    await this.utils.insertIntoTable(table.name, unquotedValues);
    return {
      ...values,
      $type: "INSERT",
      $rowId: change.new_row_id,
      $tableName: table.name,
    } as Delta;
  }
  private async redoDeletion(table: Table, change: Change): Promise<Delta> {
    const run = await this.connection.run(
      `DELETE FROM ${table.name} WHERE rowid=$rowId`,
      { $rowId: change.old_row_id }
    );
    if (run.changes == null || run.changes === 0) {
      throw new UndoLogError(
        `Unable to delete rowid=${change.new_row_id} in table '${table.name}'.`
      );
    }
    return {
      $type: "DELETE",
      $rowId: change.new_row_id,
      $tableName: table.name,
    } as Delta;
  }
  private async redoUpdate(table: Table, change: Change): Promise<Delta> {
    const values = await this.logUtils.actions.getValuesOfChange(change, "new");
    const unquotedValues = this.utils.unquote(values);
    await this.utils.updateTable(table.name, change.old_row_id, unquotedValues);
    return {
      ...values,
      $type: "UPDATE",
      $rowId: change.new_row_id,
      $tableName: table.name,
    } as Delta;
  }
}
