import { Connection } from "../sqlite3";
import {
  TableDefinition,
  Action,
  ChannelStatus,
  Change,
  Channel,
  CleanUpTask,
  CleanUpTasks,
  CleanUpTaskType,
  Configs,
} from "../undo-log-tables";
import { UndoLogError } from "../undo-log";
import { OldOrNew, ColumnValue, NameValueType, Utils } from "../utils";
import { ActionServices, ChannelServices, ConfigurationServices, PrivateServices, SetupServices, TableServices, TeardownServices, UndoLogUtilityServices } from "../undo-log-utils";

export class SetupServicesImpl implements SetupServices {
  private connection: Connection;
  private prefix: string;
  private utils: Utils;
  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.connection = srv.connection;  
    this.prefix = srv.prefix;
    this.utils = srv.utils;
  }

  async updateUndoLogTable<T extends Record<string, any> & { id: number }>(
    tableName: string,
    data: Partial<T> & { id: number }
  ): Promise<void> {
    const [parameters, tail] = this.utils.toParameterList(data);
    const query = `UPDATE ${this.prefix}${tableName} SET ${tail.join(
      ", "
    )} WHERE id=$id`;
    await this.connection.run(query, parameters);
  }

  async createUndoLogTable(tableName: string, definition: TableDefinition) {
    const columns = this.utils.createColumnDefinitions(definition);
    const foreigns = this.utils.createForeignKeys(definition, this.prefix);
    const uniques = this.utils.createUniqueKeys(definition);
    const query = `CREATE TABLE ${this.prefix}${tableName} (${columns}${foreigns}${uniques});`;
    await this.connection.execute(query);
  }
}

export class TeardownServicesImpl implements TeardownServices  {
  private connection: Connection;
  private prefix: string;
  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.connection = srv.connection;  
    this.prefix = srv.prefix;
  }

  async dropUndoLogTable(tableName: string) {
    const query = `DROP TABLE ${this.prefix}${tableName}`;
    await this.connection.execute(query);
  }

  getCleanUpTasksRelatedTo(tableName: string): Promise<CleanUpTask[]> {
    return this.connection.getAll<CleanUpTask>(`
      SELECT *
      FROM ${this.prefix}${CleanUpTasks.name}
      WHERE ref_table_name = $tableName
    `, { $tableName: tableName });
  }

  getCleanUpTasksByType(taskType: CleanUpTaskType): Promise<CleanUpTask[]> {
    return this.connection.getAll<CleanUpTask>(`
      SELECT *
      FROM ${this.prefix}${CleanUpTasks.name}
      WHERE type = $type
    `, { $type: taskType });
  }

  async cleanUp(task: CleanUpTask): Promise<void> {
    if(task.type === "TRIGGER") {
      await this.connection.run(`DROP TRIGGER ${task.name}`);
    } else {
      await this.connection.run(`DROP TABLE ${task.name}`);
    }        
  }
  
  async cleanUpAll(tasks: CleanUpTask[]): Promise<void> {
    for (const task of tasks) {
      await this.cleanUp(task);
    }
  }

}

export class ConfigurationServicesImpl implements ConfigurationServices {
  private connection: Connection;
  private prefix: string;
  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.connection = srv.connection;  
    this.prefix = srv.prefix;
  }

  async getConfig(name: string): Promise<number> {
    const row = await this.connection.getSingle<{value: number}>(`
      SELECT value
      FROM ${this.prefix}${Configs.name}
      WHERE name=$name
      LIMIT 1
    `, { $name: name });
    return row?.value ?? 0;
  }

  async setConfig(name: string, value: number): Promise<void> {
    await this.connection.run(`
      INSERT OR REPLACE INTO ${this.prefix}${Configs.name} (name, value)
      VALUES ($name, $value)
    `, { $name: name, $value: value });
  }
}

export class TableServicesImpl implements TableServices {
  private prefix: string;
  private utils: Utils;

  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.prefix = srv.prefix;
    this.utils = srv.utils;
  }

  insertIntoUndoLogTable<T extends Record<string, any>>(
    tableName: string,
    row: T
  ): Promise<number> {
    return this.utils.insertIntoTable<T>(`${this.prefix}${tableName}`, row);
  }
  insertBlindlyIntoUndoLogTable<T extends Record<string, any>, I extends keyof T>(tableName: string, row: Omit<T, I>): Promise<number> {
    return this.utils.insertBlindlyIntoTable<T, I>(`${this.prefix}${tableName}`, row);
  }
}

export class ChannelServicesImpl implements ChannelServices {
  private connection: Connection;
  private prefix: string;
  private setup: SetupServices;
  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.connection = srv.connection;  
    this.prefix = srv.prefix;
    this.setup = srv.setup;
  }

  async updateChannel(channelId: number, status: ChannelStatus) {
    await this.setup.updateUndoLogTable<Channel>("channels", {
      id: channelId,
      status,
    });
  }

  async getChannel(channelId: number): Promise<Channel | null> {
    return this.connection.getSingle<Channel>(
      `SELECT * FROM ${this.prefix}channels WHERE id=$channelId`,
      { $channelId: channelId }
    );
  }
  
  async getOrCreateReadyChannel(channel: number) {
    const parameters = { $channel: channel };
    await this.connection.run(
      `INSERT OR IGNORE INTO ${this.prefix}channels (id, status) VALUES ($channel, 'READY')`,
      parameters
    );
    const row = await this.connection.getSingle<Channel>(
      `SELECT * FROM ${this.prefix}channels WHERE id=$channel`,
      parameters
    );
    if (row == null) {
      throw new UndoLogError(`Unable to create or get a channel '${channel}'.`);
    }
    if (row.status !== "READY") {
      throw new UndoLogError(
        `Expected channel '${channel}' to have status 'READY', but was '${row.status}'.`
      );
    }
  }
}

export class ActionServicesImpl implements ActionServices {
  private connection: Connection;
  private prefix: string;
  private setup: SetupServices;

  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.connection = srv.connection;  
    this.prefix = srv.prefix;
    this.setup = srv.setup;
  }

  async getActionsOfChannel(channel: Channel): Promise<Action[]> {
    const query = `
      SELECT a.*
      FROM ${this.prefix}actions a
      WHERE a.channel_id=$channelId
      ORDER BY a.order_index DESC
    `;
    const parameters = {
      $channelId: channel.id,
    };
    return this.connection.getAll<Action>(query, parameters);
  }

  async getChangesOfAction(action: Action): Promise<Change[]> {
    const query = `
      SELECT ch.*
      FROM ${this.prefix}changes ch
      WHERE ch.action_id=$actionId
      ORDER BY ch.order_index
    `;
    const parameters = {
      $actionId: action.id,
    };
    return this.connection.getAll<Change>(query, parameters);
  }

  async getValuesOfChange(
    change: Change,
    type: OldOrNew
  ): Promise<Record<string, ColumnValue>> {
    const query = `
      SELECT c.name, v.${type}_value AS value, c.type
      FROM ${this.prefix}values v
        INNER JOIN ${this.prefix}columns c
        ON v.column_id=c.id
      WHERE v.change_id=$changeId
    `;
    const parameters = {
      $changeId: change.id,
    };
    const nameValues = await this.connection.getAll<NameValueType>(
      query,
      parameters
    );
    let record = {};
    nameValues.forEach(
      (nv) =>
        (record = {
          ...record,
          [nv.name]: {
            value: nv.value,
            type: nv.type,
          },
        })
    );
    return record;
  }

  async markActionAsUndone(actionId: number, undone: boolean): Promise<void> {
    this.setup.updateUndoLogTable<Action>("actions", {
      id: actionId,
      undone,
    });
  }
}
