import { ChangeType, Channel } from "./undo-log-tables";
import { ColumnValue } from "./utils";

export class UndoLogError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface UndoLogStatus {
  status: Channel['status'];
  undos: number;
  redos: number;
}

export type Delta = {
  $type: ChangeType;
  $tableName: string;
  $rowId: number;
} & Record<string, ColumnValue>;

export interface UndoLog {
  startTracking(channel: number, categoryName?: string): Promise<void>;
  stopTracking(channel: number): Promise<void>;
  undo(channel: number): Promise<Delta[]>;
  redo(channel: number): Promise<Delta[]>;
  status(channel: number): Promise<UndoLogStatus>;
}
