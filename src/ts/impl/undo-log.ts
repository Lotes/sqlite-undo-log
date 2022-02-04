import { Connection, UndoLogUtils, UndoLog, UndoLogError } from "../types";
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
    const channel = await this.utils.getOrCreateReadyChannel(channelId);
    if(channel.status !== "READY") {
      throw new UndoLogError("Forbidden call: undo log must be in status READY for recording actions.");
    }
    const categoryId = await this.getOrCreateCategory(categoryName);
    await this.createNewAction(channel.id, categoryId);
    await this.utils.updateChannel(channel.id, "RECORDING");
    try{
      await action();
    } finally{
      await this.utils.updateChannel(channel.id, "READY");
    }
  }
  private async createNewAction(channelId: number, categoryId: number|null) {
    const query = `
      INSERT INTO ${this.prefix}actions
              (created_at,      category_id, channel_id,  undone, order_index)
        SELECT datetime('now'), $categoryId, a.channel_id, 0,      MAX(IFNULL(a.order_index, 0))+1
          FROM ${this.prefix}channels ch
            LEFT JOIN ${this.prefix}actions a
            ON ch.id=a.channel_id
          WHERE a.channel_id=$channelId
          GROUP BY a.channel_id
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