import { Connection, UndoLogUtils, UndoLog, UndoLogError, NameValuePair } from "../types";
import { Row } from "../tables";

export class UndoLogImpl implements UndoLog {
  private connection: Connection;
  private prefix: string;
  private utils: UndoLogUtils;
  constructor(connection: Connection, utils: UndoLogUtils, prefix: string = "undo_") {
    this.connection = connection;
    this.prefix = prefix;
    this.utils = utils; 
  }
  async recordWithin(channelId: number, categoryName: string|undefined, action: () => Promise<void>): Promise<void> {
    await this.utils.getOrCreateReadyChannel(channelId);
    const categoryId = await this.getOrCreateCategory(categoryName);
    await this.createNewAction(channelId, categoryId);
    await this.doItWhileChannelHasStatus(channelId, "RECORDING", action);
  }
  private async doItWhileChannelHasStatus(channelId: number, status: Row.Channel["status"],  action: () => Promise<void>){
    await this.utils.updateChannel(channelId, status);
    try{
      await action();
    } finally{
      await this.utils.updateChannel(channelId, "READY");
    }
  }
  private async createNewAction(channelId: number, categoryId: number|null) {
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
      $channelId: channelId 
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
      const row = await this.connection.getSingle<Row.Category>(
        `SELECT id FROM ${this.prefix}categories WHERE name=$name`,
        parameters
      );
      return row!.id;
    }
    return null;
  }
  async undo(channelId: number): Promise<void> {
    await this.utils.getOrCreateReadyChannel(channelId);
    const query = `SELECT a.* FROM ${this.prefix}channels ch LEFT JOIN ${this.prefix}actions a ON a.channel_id=ch.id WHERE ch.id=$channel ORDER BY a.order_index DESC LIMIT 1`;
    const parameters = {$channel: channelId};
    const row = await this.connection.getSingle<Row.Action>(query, parameters);
    if(row?.id == null) {
      throw new UndoLogError(`Channel '${channelId}' is at the bottom of the action stack.`);
    }
    await this.doItWhileChannelHasStatus(channelId, "UNDOING", () => this.undoAction(row));
  }
  private async undoAction(action: Row.Action) {
    const query = `SELECT * FROM ${this.prefix}changes ch WHERE ch.action_id=$actionId ORDER BY ch.order_index DESC`;
    const parameters = {$actionId:action.id};
    const changes = await this.connection.getAll<Row.Change>(query, parameters);
    for(const change of changes) {
      await this.undoChange(change);
    }
    await this.utils.markActionAsUndone(action.id, true);
  }
  private async undoChange(change: Row.Change) {
    const query = `SELECT * FROM ${this.prefix}tables WHERE id=$id`;
    const parameters = {$id:change.table_id};
    const table = await this.connection.getSingle<Row.Table>(query, parameters);
    if(table == null) {
      throw new UndoLogError(`Unknown table with id '${change.table_id}'.`);
    }
    switch(change.type) {
      case "INSERT": await this.undoInsertion(table, change); break;
      case "DELETE": await this.undoDeletion(table, change); break;
      case "UPDATE": await this.undoUpdate(table, change); break;
    }
  }
  private async undoInsertion(table: Row.Table, change: Row.Change) {
    const run = await this.connection.run(`DELETE FROM ${table.name} WHERE rowid=$rowId`, {$rowId: change.row_id});
    if(run.changes == null || run.changes === 0) {
      throw new UndoLogError(`Unable to delete rowid=${change.row_id} in table '${table.name}'.`);
    }
  }
  private async undoDeletion(table: Row.Table, change: Row.Change) {
    const values = await this.getValues(change, "old");
    let record = {};
    values.forEach(v => record = {...record, [v.name]: v.value});
    await this.utils.insertIntoTable(table.name, record);
  }
  private async undoUpdate(table: Row.Table, change: Row.Change) {
    const values = await this.getValues(change, "old");
    let record = {};
    values.forEach(v => record = {...record, [v.name]: v.value});
    await this.utils.updateTable(table.name, change.row_id, record);
  }
  private async getValues(change: Row.Change, which:"old"|"new") {
    const query = `
      SELECT c.name, v.${which}_value AS value
      FROM ${this.prefix}values v INNER JOIN ${this.prefix}columns c ON v.column_id=c.id
      WHERE v.change_id=$changeId
    `;
    const parameters = {$changeId: change.id};
    return await this.connection.getAll<NameValuePair>(query, parameters);
  }
}