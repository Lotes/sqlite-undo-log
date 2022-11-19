export interface UndoLogSetup {
  install(): Promise<string[]>;
  uninstall(): Promise<void>;
  addTable(name: string, channel: number): Promise<void>;
  removeTable(name: string): Promise<void>;
}