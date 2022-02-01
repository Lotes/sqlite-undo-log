export interface UndoLogSetup {
  install(): Promise<void>;
  uninstall(): Promise<void>;
  addTable(name: string, channel: number): Promise<void>;
  removeTable(name: string): Promise<void>;
}

export interface UndoLog {
  next(channel: number, categoryName?: string): Promise<void>;
  undo(channel: number): Promise<void>;
}

export class UndoLogError extends Error {
  constructor(message: string) {
    super(message);
  }
}