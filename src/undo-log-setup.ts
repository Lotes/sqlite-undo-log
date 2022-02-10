export interface UndoLogSetup {
  install(): Promise<void>;
  uninstall(): Promise<void>;
  addTable(name: string, channel: number): Promise<void>;
  removeTable(name: string): Promise<void>;
}
