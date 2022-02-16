import { Connection } from "../sqlite3";
import { tables, ChangeType, TableColumn } from "../tables";
import { UndoLogSetup } from "../undo-log-setup";
import { UndoLogUtils } from "../undo-log-utils";

export class UndoLogSetupImpl implements UndoLogSetup {
  private connection: Connection;
  private prefix: string;
  private utils: UndoLogUtils;
  constructor(
    connection: Connection,
    utils: UndoLogUtils,
    prefix: string = "undo_"
  ) {
    this.connection = connection;
    this.prefix = prefix;
    this.utils = utils;
  }
  async install(): Promise<void> {
    for (const table of tables) {
      await this.utils.createUndoLogTable(table.name, table);
    }
  }
  async uninstall(): Promise<void> {
    for (const table of tables) {
      await this.utils.dropUndoLogTable(table.name);
    }
  }
  async addTable(name: string, channelId: number): Promise<void> {
    await this.utils.getOrCreateReadyChannel(channelId);
    const tableId = await this.createUndoLogTable(name, channelId);
    const columns = await this.createUndoLogColumns(tableId, name);
    await this.createTrigger("INSERT", name, columns);
    await this.createTrigger("UPDATE", name, columns);
    await this.createTrigger("DELETE", name, columns);
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

  private async createTrigger(
    type: ChangeType,
    tableName: string,
    columns: TableColumn[]
  ) {
    const queryAddChange = (recordOld: boolean, recordNew: boolean) => `
      INSERT INTO ${
        this.prefix
      }changes (type, old_row_id, new_row_id, action_id, order_index, table_id)
      SELECT ${this.connection.escapeString(type)}, ${
      recordOld ? "OLD.rowid" : "NULL"
    }, ${
      recordNew ? "NEW.rowid" : "NULL"
    }, a.id, MAX(IFNULL(c.order_index,0))+1, t.id
      FROM ${this.prefix}tables t
        INNER JOIN ${this.prefix}channels ch ON t.channel_id=ch.id
        INNER JOIN ${this.prefix}actions a ON a.channel_id=ch.id
        LEFT JOIN ${this.prefix}changes c ON a.id=c.action_id
      WHERE t.name=${this.connection.escapeString(tableName)}
        AND a.order_index=(
          SELECT MAX(ma.order_index)
          FROM undo_actions ma
          WHERE ma.channel_id=ch.id
        )
      GROUP BY a.id;
    `;
    const queryAddValues = (recordOld: boolean, recordNew: boolean) => {
      const oldValue = (c: TableColumn) =>
        recordOld ? `, quote(OLD.${c.name})` : "";
      const newValue = (c: TableColumn) =>
        recordNew ? `, quote(NEW.${c.name})` : "";
      const where = (c: TableColumn) => {
        const notEqual = recordOld && recordNew
          ? ` AND OLD.${c.name} <> NEW.${c.name}`
          : "";
        return `WHERE id=${c.id}${notEqual}`;
      };
      const createSelect = (c: TableColumn) =>
        `SELECT ${c.id}, last_insert_rowid()${oldValue(c)}${newValue(c)} FROM ${
          this.prefix
        }columns ${where(c)}`;
      const oldColumn = recordOld ? ", old_value" : "";
      const newColumn = recordNew ? ", new_value" : "";
      return `
      INSERT INTO ${
        this.prefix
      }values (column_id, change_id${oldColumn}${newColumn})
      ${columns.map(createSelect).join("\r\n      UNION ")};
    `;
    };
    const queryTrigger = `
      CREATE TRIGGER ${type.toLowerCase()}_${tableName}_trigger
        ${type === "DELETE" ? "BEFORE" : "AFTER"} ${type} ON ${tableName}
        FOR EACH ROW
        WHEN (${this.queryIsTablesChannelStatusEqRecording(tableName)})
      BEGIN
        ${queryAddChange(type !== "INSERT", type !== "DELETE")}
        ${queryAddValues(type !== "INSERT", type !== "DELETE")}
      END;`;
    await this.connection.execute(queryTrigger);
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
