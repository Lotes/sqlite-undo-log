import {
  TableDefinition,
  ChannelStatus,
  Action,
  Change,
  Channel,
} from "./tables";
import { OldOrNew } from "./types";
import { Utils } from "./utils";

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
  ): Promise<void>;
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
  ): Promise<Record<string, any>>;
}
