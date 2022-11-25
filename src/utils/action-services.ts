import {
  Action,
  Change,
  Channel
} from "../undo-log-tables";
import { OldOrNew, ColumnValue } from "./types";

export interface ActionServices {
  markActionAsUndone(actionId: number, undone: boolean): Promise<void>;
  getActionsOfChannel(channel: Channel): Promise<Action[]>;
  getChangesOfAction(action: Action): Promise<Change[]>;
  getValuesOfChange(
    change: Change,
    type: OldOrNew
  ): Promise<Record<string, ColumnValue>>;
}
