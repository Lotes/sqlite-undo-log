import { Connection, ConnectionListener, WeakConnection } from "../sqlite3";
import { tables, ChangeType, TableColumn, CleanUpTasks, CleanUpTask, CleanUpTaskType, ConfigNames, Logs, Changes, Configs, Channels, Actions, Tables, Values, Variables } from "../undo-log-tables";
import { UndoLogSetup } from "../undo-log-setup";
import { UndoLogUtilityServices } from "../undo-log-utils";
import { Utils } from "../utils";

const CLEANUP_TASK_NAME = CleanUpTasks.name;
export class UndoLogSetupImpl implements UndoLogSetup {
  private logger: WeakConnection;
  private listener: ConnectionListener;
  private debug: boolean = false;
  constructor(
    private connection: Connection,
    private logUtils: UndoLogUtilityServices,
    private forceForeignKeys: boolean = true,
    private utils: Utils,
    private prefix: string = "undo_"
  ) {
    this.logger = connection.clone();
    this.listener = async event => {
      await this.logger.run(`
        INSERT INTO ${prefix}${Logs.name} (timestamp, query, parameters, location)
        VALUES (${this.scriptTimestamp()}, $query, $parameters, $location)`,
        {
          $query: event.query,
          $parameters: JSON.stringify(event.parameters),
          $location: event.location,
        }
      );
    }
  }
  private scriptTimestamp(): string {
    return "strftime('%Y-%m-%d %H-%M-%f','now')";
  }
  async enableDebugMode(enabled: boolean): Promise<void> {
    await this.logUtils.config.setConfig(ConfigNames.DEBUG, enabled?1:0);
    await this.syncDebugMode();
  }
  async install(): Promise<string[]> {
    if(this.forceForeignKeys) {
      await this.connection.execute("PRAGMA foreignKeys=1");
    }
    if (!await this.isAlreadyInstalled()) {
      for (const table of tables) {
        await this.logUtils.setup.createUndoLogTable(table.name, table);
        await this.logUtils.tables.insertBlindlyIntoUndoLogTable<CleanUpTask, 'id'>(CLEANUP_TASK_NAME, {
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
    this.debug = (await this.logUtils.config.getConfig(ConfigNames.DEBUG)) === 1;
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
    const tasks = await this.logUtils.teardown.getCleanUpTasksByType('TRIGGER');
    await this.logUtils.teardown.cleanUpAll(tasks);
  }
  async uninstall(): Promise<void> {
    await this.cleanUp('TRIGGER');
    await this.cleanUp('TABLE');
    await this.cleanUp('ROOT');
  }
  async addTable(name: string, channelId: number): Promise<void> {
    await this.logUtils.channels.getOrCreateReadyChannel(channelId);
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

  private scriptAddChange(type: ChangeType, tableName: string): string {
    const recordOld = type !== "INSERT";
    const recordNew = type !== "DELETE";
    return `
      INSERT INTO ${
        this.prefix
      }${Changes.name} (type, old_row_id, new_row_id, action_id, order_index, table_id)
      SELECT ${this.connection.escapeString(type)}, ${
      recordOld ? "OLD.rowid" : "NULL"
    }, ${
      recordNew ? "NEW.rowid" : "NULL"
    }, a.id, MAX(IFNULL(c.order_index,0))+1, t.id
      FROM ${this.prefix}${Tables.name} t
        INNER JOIN ${this.prefix}${Channels.name} ch ON t.channel_id=ch.id
        INNER JOIN ${this.prefix}${Actions.name} a ON a.channel_id=ch.id
        LEFT JOIN ${this.prefix}${Changes.name} c ON a.id=c.action_id
      WHERE t.name=${this.connection.escapeString(tableName)}
        AND a.order_index=(
          SELECT MAX(ma.order_index)
          FROM undo_actions ma
          WHERE ma.channel_id=ch.id
        )
      GROUP BY a.id;
    `;
  }

  scriptLogChange(triggerName: string, getChangeIdQuery: string): string {
    return `
      INSERT INTO ${this.prefix}${Logs.name} (timestamp, query, parameters, location)
      SELECT
        ${this.scriptTimestamp()},
        'INSERT INTO ${this.prefix}${Changes.name} (type, old_row_id, new_row_id, action_id, order_index, table_id) VALUES ($type, $old_row_id, $new_row_id, $action_id, $order_index, $table_id)', 
        (
          SELECT json_object(
            ${Object.keys(Changes.columns).map(c => `'$${c}', ${c}`).join(',\r\n            ')}
          )
          FROM ${this.prefix}${Changes.name}
          WHERE id=(${getChangeIdQuery}) LIMIT 1
        ),
        '${triggerName}'
      FROM ${this.prefix}${Configs.name}
      WHERE name=${this.connection.escapeString(ConfigNames.DEBUG)} AND value=1;
    `;
  }

  scriptLogValues(location: string, getChangeIdQuery: string) {
    return `
      INSERT INTO ${this.prefix}${Logs.name} (timestamp, query, parameters, location)
      SELECT
        ${this.scriptTimestamp()},
        'INSERT INTO ${this.prefix}${Values.name} (column_id, change_id, old_value, new_value) VALUES ($column_id, $change_id, $old_value, $new_value)', 
        json_object(
          '$column_id', v.column_id,
          '$change_id', v.change_id,
          '$old_value', v.old_value,
          '$new_value', v.new_value
        ),
        '${location}'
      FROM
        ${this.prefix}${Values.name} v,
        ${this.prefix}${Configs.name} c
      WHERE
        v.change_id=(${getChangeIdQuery})
        AND c.name=${this.connection.escapeString(ConfigNames.DEBUG)} AND c.value=1;
    `;
  }

  private scriptAddValues(type: ChangeType, columns: TableColumn[], getChangeIdQuery: string) {
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
    const createSelect = (c: TableColumn) => `
      SELECT ${c.id}, (${getChangeIdQuery})${oldValue(c)}${newValue(c)}
      FROM ${this.prefix}columns
      ${where(c)}
    `;
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
    const variableName = triggerName + '_last_change_id_';
    const variableNameExpression = this.connection.escapeString(variableName)+" || "+(type === "DELETE" ? 'OLD' : 'NEW')+'.rowid';
    const getVariableQuery = this.scriptGetVariableQuery(variableNameExpression);
    await this.logUtils.tables.insertBlindlyIntoUndoLogTable<CleanUpTask, 'id'>(CLEANUP_TASK_NAME, {
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
        ${this.scriptAddChange(type, tableName)}
        ${this.scriptSetVariable(variableNameExpression, 'last_insert_rowid()')}
        ${this.scriptLogChange(triggerName, getVariableQuery)}
        ${this.scriptAddValues(type, columns, getVariableQuery)}
        ${this.scriptLogValues(triggerName, getVariableQuery)}
        ${this.scriptUnsetVariable(variableNameExpression)}
      END;
    `;
    return this.connection.execute(queryTrigger);
  }

  scriptSetVariable(nameQuery: string, subQuery: string) {
    return `INSERT OR REPLACE INTO ${this.prefix}${Variables.name} (name, value) VALUES (${nameQuery}, ${subQuery});`;
  }

  scriptUnsetVariable(nameQuery: string) {
    return `DELETE FROM ${this.prefix}${Variables.name} WHERE name=${nameQuery};`;
  }

  scriptGetVariableQuery(nameQuery: string) {
    return `
      SELECT value
      FROM ${this.prefix}${Variables.name}
      WHERE name=${nameQuery}
      LIMIT 1
    `;
  }

  async removeTable(nameQuery: string): Promise<void> {
    const tasks = await this.logUtils.teardown.getCleanUpTasksRelatedTo(nameQuery);
    await this.logUtils.teardown.cleanUpAll(tasks);
    await this.connection.run(`
      DELETE FROM ${this.prefix}tables
      WHERE name=${nameQuery}
    `,
      {
        $name: nameQuery,
      }
    );
  }
}
