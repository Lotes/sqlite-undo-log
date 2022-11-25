import { inject, Module } from "djinject";
import { SetupServicesImpl, TeardownServicesImpl, ConfigurationServicesImpl, TableServicesImpl, ChannelServicesImpl, ActionServicesImpl } from "./impl/undo-log-utils";
import { UtilsImpl } from "./impl/utils";
import { Connection } from "./sqlite3";
import {
  TableDefinition,
  ChannelStatus,
  Action,
  Change,
  Channel,
  CleanUpTask,
  CleanUpTaskType,
} from "./undo-log-tables";
import { ColumnValue, OldOrNew, Utils } from "./utils";

export interface UndoLogUtilityServices {
  setup: SetupServices;
  teardown: TeardownServices;
  config:  ConfigurationServices;
  tables: TableServices;
  channels: ChannelServices;
  actions: ActionServices;
  utils: Utils;
}

export interface PrivateServices {
  connection: Connection;
  prefix: string;
}


export interface SetupServices {
  createUndoLogTable(
    tableName: string,
    definition: TableDefinition
  ): Promise<void>;
  updateUndoLogTable<T extends Record<string, any> & { id: number }>(
    tableName: string,
    data: Partial<T> & { id: number }
  ): Promise<void>;
}

export interface TeardownServices {
  dropUndoLogTable(tableName: string): Promise<void>;
  getCleanUpTasksRelatedTo(tableName: string): Promise<CleanUpTask[]>;
  getCleanUpTasksByType(taskType: CleanUpTaskType): Promise<CleanUpTask[]>;
  cleanUp(task: CleanUpTask): Promise<void>;
  cleanUpAll(tasks: CleanUpTask[]): Promise<void>;
}

export interface ConfigurationServices {
  getConfig(name: string): Promise<number>;
  setConfig(name: string, value: number): Promise<void>;
}

export interface TableServices {
  insertIntoUndoLogTable<T extends Record<string, any>>(
    tableName: string,
    row: T
  ): Promise<number>;
  insertBlindlyIntoUndoLogTable<T extends Record<string, any>, I extends keyof T>(
    tableName: string,
    row: Omit<T, I>
  ): Promise<number>;
}

export interface ChannelServices {
  getOrCreateReadyChannel(channelId: number): Promise<void>;
  updateChannel(channelId: number, status: ChannelStatus): Promise<void>;
  getChannel(channelId: number): Promise<Channel | null>;
}

export interface ActionServices {
  markActionAsUndone(actionId: number, undone: boolean): Promise<void>;
  getActionsOfChannel(channel: Channel): Promise<Action[]>;
  getChangesOfAction(action: Action): Promise<Change[]>;
  getValuesOfChange(
    change: Change,
    type: OldOrNew
  ): Promise<Record<string, ColumnValue>>;
}

function module(connection: Connection, prefix: string): Module<UndoLogUtilityServices & PrivateServices> {
  return {
    connection: () => connection,
    prefix: () => prefix,
    utils: srv => new UtilsImpl(srv.connection),
    setup: srv => new SetupServicesImpl(srv),
    teardown: srv => new TeardownServicesImpl(srv),
    config: srv => new ConfigurationServicesImpl(srv),
    tables: srv => new TableServicesImpl(srv),
    channels: srv => new ChannelServicesImpl(srv),
    actions: srv => new ActionServicesImpl(srv)  
  };
}

export function createUndoLogUtilityServices(connection: Connection, prefix: string): UndoLogUtilityServices {
  return inject(module(connection, prefix)) as UndoLogUtilityServices;
}