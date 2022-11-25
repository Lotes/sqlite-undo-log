import { Action, Change, Channel, ChannelStatus } from "./undo-log-tables";

export interface UndoLogAssertions {
  assertChannelInStatus(
    channelId: number,
    status: ChannelStatus
  ): Promise<Channel>;
  assertChannelHasActions(
    channel: Channel,
    numberOfActions: number
  ): Promise<Action[]>;
  assertActionHasChanges(
    action: Action,
    numberOfChanges: number
  ): Promise<Change[]>;
  assertChangeHasValues<T extends Record<string, any>>(
    change: Change,
    type: "old" | "new",
    values: Partial<T>
  ): Promise<void>;
}
