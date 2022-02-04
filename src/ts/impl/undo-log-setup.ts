import tables from "../tables";
import { UndoLogUtils, Connection, TableColumn, UndoLogSetup } from "../types";

export class UndoLogSetupImpl implements UndoLogSetup {
  private connection: Connection;
  private prefix: string;
  private utils: UndoLogUtils;
  constructor(connection: Connection, utils: UndoLogUtils, prefix: string = "undo_") {
    this.connection = connection;
    this.prefix = prefix;
    this.utils = utils;
  }
  async install(): Promise<void> {
    for (const n of Object.getOwnPropertyNames(tables)) {
      await this.utils.createUndoLogTable(n, tables[n]);
    }
  }
  async uninstall(): Promise<void> {
    //TODO drop triggers
    for (const n of Object.getOwnPropertyNames(tables).reverse()) {
      await this.utils.dropUndoLogTable(`${n}`);
    }
  }
  async addTable(name: string, channelId: number): Promise<void> {
    await this.utils.getOrCreateReadyChannel(channelId);
    const tableId = await this.createUndoLogTable(name, channelId);
    const columns = await this.createUndoLogColumns(tableId, name);
    await this.createInsertTrigger(name, columns);
  }
  private async createUndoLogColumns(tableId: number, tableName: string) {
    const columns = await this.utils.getMetaTable(tableName);
    const keyTable = "$table";
    let parameters: Record<string, string | number> = { [keyTable]: tableId };
    let dataStrings: string[] = [];
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
  private async createUndoLogTable(name: string, channel: number) {
    const query = `INSERT INTO ${this.prefix}tables (name, channel_id) VALUES ($name, $channel)`;
    const parameters = {
      $name: name,
      $channel: channel,
    };
    return (await this.connection.run(query, parameters)).lastID!;
  }

  private queryIsTablesChannelStatusEqRecording(name: string) {
    return `
        SELECT ch.status IN ('RECORDING')
        FROM ${this.prefix}channels ch
          INNER JOIN ${this.prefix}tables t
        WHERE t.name=${this.connection.escapeString(name)}
      `;
  }

  private async createInsertTrigger(name: string, columns: TableColumn[]) {
    const query = `
    CREATE TRIGGER ${this.prefix}log_insertion_${name}_trigger
      AFTER INSERT ON ${name}
      FOR EACH ROW
      WHEN (${this.queryIsTablesChannelStatusEqRecording(name)})
    BEGIN
      INSERT INTO ${this.prefix}changes
              (type,     row_id,    action_id,    order_index,                    table_id)
        SELECT 
          'INSERT',
          NEW.rowid,
          a.id,
          MAX(IFNULL(c.order_index,0))+1,
          t.id
        FROM ${this.prefix}tables t
          INNER JOIN ${this.prefix}channels ch ON t.channel_id=ch.id
          INNER JOIN ${this.prefix}actions a ON a.channel_id=ch.id
          LEFT JOIN ${this.prefix}changes c ON a.id=c.action_id
        WHERE t.name=${this.connection.escapeString(name)}
          AND a.order_index=(
            SELECT MAX(ma.order_index)
            FROM undo_actions ma
            WHERE ma.channel_id=ch.id
          )
        GROUP BY a.id;
  
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
