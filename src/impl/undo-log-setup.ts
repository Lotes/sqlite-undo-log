import { Connection, ConnectionListener, WeakConnection } from "../sqlite3";
import { tables, ChangeType, TableColumn, CleanUpTasks, CleanUpTask, CleanUpTaskType, ConfigNames, Logs } from "../undo-log-tables";
import { UndoLogSetup } from "../undo-log-setup";
import { UndoLogUtils } from "../undo-log-utils";

const CLEANUP_TASK_NAME = CleanUpTasks.name;
export class UndoLogSetupImpl implements UndoLogSetup {
  private logger: WeakConnection;
  private listener: ConnectionListener;
  private debug: boolean = false;
  constructor(
    private connection: Connection,
    private utils: UndoLogUtils,
    private forceForeignKeys: boolean = true,
    private prefix: string = "undo_"
  ) {
    this.logger = connection.clone();
    this.listener = async event => {
      await this.logger.run(`
        INSERT INTO ${prefix}${Logs.name} (timestamp, query, parameters, location)
        VALUES (strftime('%Y-%m-%d %H-%M-%f','now'), $query, $parameters, $location)`,
        {
          $query: event.query,
          $parameters: JSON.stringify(event.parameters),
          $location: event.location,
        }
      );
    }
  }
  async enableDebugMode(enabled: boolean): Promise<void> {
    await this.utils.setConfig(ConfigNames.DEBUG, enabled?1:0);
    await this.syncDebugMode();
  }
  async install(): Promise<string[]> {
    if(this.forceForeignKeys) {
      await this.connection.execute("PRAGMA foreignKeys=1");
    }
    if (!await this.isAlreadyInstalled()) {
      for (const table of tables) {
        await this.utils.createUndoLogTable(table.name, table);
        await this.utils.insertBlindlyIntoUndoLogTable<CleanUpTask, 'id'>(CLEANUP_TASK_NAME, {
          type: CLEANUP_TASK_NAME === table.name ? "ROOT" : "TABLE",
          name: `${this.prefix}${table.name}`,
          ref_table_name: null,
        });
      }
    }
    await this.syncDebugMode();
    return tables.map(t => `${this.prefix}${t.name}`);
  }
  async syncDebugMode() {
    this.debug = (await this.utils.getConfig(ConfigNames.DEBUG)) === 1;
    if(this.debug) {
      this.connection.addConnectionListener(this.listener);
    } else {
      this.connection.removeConnectionListener(this.listener);
    }
  }
  private async isAlreadyInstalled(): Promise<boolean> {
    let alreadyInstalled = true;
    for (const table of tables) {
      alreadyInstalled &&= await this.utils.doesTableExist(table.name);
    }
    return alreadyInstalled;
  }
  private async cleanUp(type: CleanUpTaskType) {
    const tasks = await this.utils.getCleanUpTasksByType('TRIGGER');
    await this.utils.cleanUpAll(tasks);
  }
  async uninstall(): Promise<void> {
    await this.cleanUp('TRIGGER');
    await this.cleanUp('TABLE');
    await this.cleanUp('ROOT');
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

  private queryAddChange(type: ChangeType, tableName: string): string {
    const recordOld = type !== "INSERT";
    const recordNew = type !== "DELETE";
    return `
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
  }

  private queryAddValues(type: ChangeType, columns: TableColumn[]) {
    const recordOld = type !== "INSERT";
    const recordNew = type !== "DELETE";
    const oldValue = (c: TableColumn) =>
      recordOld ? `, quote(OLD.${c.name})` : "";
    const newValue = (c: TableColumn) =>
      recordNew ? `, quote(NEW.${c.name})` : "";
    const where = (c: TableColumn) => {
      const notEqual =
        recordOld && recordNew ? ` AND OLD.${c.name} <> NEW.${c.name}` : "";
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
  }

  private async createTrigger(
    type: ChangeType,
    tableName: string,
    columns: TableColumn[]
  ) {
    const triggerName = `${type.toLowerCase()}_${tableName}_trigger`;
    await this.utils.insertBlindlyIntoUndoLogTable<CleanUpTask, 'id'>(CLEANUP_TASK_NAME, {
      type: "TRIGGER",
      name: triggerName,
      ref_table_name: tableName,
    });
    const queryTrigger = `
      CREATE TRIGGER ${triggerName}
        ${type === "DELETE" ? "BEFORE" : "AFTER"} ${type} ON ${tableName}
        FOR EACH ROW
        WHEN (${this.queryIsTablesChannelStatusEqRecording(tableName)})
      BEGIN
        ${this.queryAddChange(type, tableName)}
        ${this.queryAddValues(type, columns)}
      END;
    `;
    return this.connection.execute(queryTrigger);
  }

  async removeTable(name: string): Promise<void> {
    const tasks = await this.utils.getCleanUpTasksRelatedTo(name);
    await this.utils.cleanUpAll(tasks);
    await this.connection.run(`
      DELETE FROM ${this.prefix}tables
      WHERE name=$name
    `,
      {
        $name: name,
      }
    );
  }
}
