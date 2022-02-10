import { Assertions } from "./assertions";
import { Action, Change, Channel, ChannelStatus } from "./tables";

export interface UndoLogAssertions extends Assertions {
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
