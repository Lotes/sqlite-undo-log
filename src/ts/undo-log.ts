export interface UndoLogSetup {
  install(): Promise<void>;
  uninstall(): Promise<void>;
  addTable(name: string, channel: number): Promise<void>;
  updateTable(name: string, channel?: number): Promise<void>;
  removeTable(name: string): Promise<void>;
}

export interface UndoLog {
  beginAction(categoryName: string): Promise<number>;
  endAction(): Promise<void>;
  undo(channel: number): Promise<void>;
  redo(channel: number): Promise<void>;
}