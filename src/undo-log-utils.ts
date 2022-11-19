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

export interface UndoLogUtils extends Utils {
  //tables
  createUndoLogTable(
    tableName: string,
    definition: TableDefinition
  ): Promise<void>;
  dropUndoLogTable(tableName: string): Promise<void>;
  insertIntoUndoLogTable<T extends Record<string, any>>(
    tableName: string,
    row: T
  ): Promise<number>;
  insertBlindlyIntoUndoLogTable<T extends Record<string, any>, I extends keyof T>(
    tableName: string,
    row: Omit<T, I>
  ): Promise<number>;
  updateUndoLogTable<T extends Record<string, any> & { id: number }>(
    tableName: string,
    data: Partial<T> & { id: number }
  ): Promise<void>;
  //channels
  getOrCreateReadyChannel(channelId: number): Promise<void>;
  updateChannel(channelId: number, status: ChannelStatus): Promise<void>;
  getChannel(channelId: number): Promise<Channel | null>;
  //actions
  markActionAsUndone(actionId: number, undone: boolean): Promise<void>;
  getActionsOfChannel(channel: Channel): Promise<Action[]>;
  //changes
  getChangesOfAction(action: Action): Promise<Change[]>;
  //values
  getValuesOfChange(
    change: Change,
    type: OldOrNew
  ): Promise<Record<string, ColumnValue>>;
  //clean up tasks
  getCleanUpTasksRelatedTo(tableName: string): Promise<CleanUpTask[]>;
  getCleanUpTasksByType(taskType: CleanUpTaskType): Promise<CleanUpTask[]>;
  cleanUp(task: CleanUpTask): Promise<void>;
  cleanUpAll(tasks: CleanUpTask[]): Promise<void>;
}
