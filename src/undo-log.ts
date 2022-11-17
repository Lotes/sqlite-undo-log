import { Channel } from "./tables";

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

export interface UndoLog {
  startTracking(channel: number, categoryName?: string): Promise<void>;
  stopTracking(channel: number): Promise<void>;
  undo(channel: number): Promise<void>;
  redo(channel: number): Promise<void>;
  status(channel: number): Promise<UndoLogStatus>;
}
