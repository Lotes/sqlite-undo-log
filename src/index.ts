export type InitializeMultipleOptions = Record<number, string | string[]>;
export type InitializeMultipleResult = Record<number, UndoLogPublic>;

export interface UndoLogSetupPublic {
  initializeSingle(channelId: number): Promise<UndoLogPublic>;
  initializeMultiple(
    options: InitializeMultipleOptions
  ): Promise<InitializeMultipleResult>;
}

export interface UndoLogConstructorOptions {
  tablePrefix: string;
  channelId: number;
}

export interface UndoLogPublic {
  trackWithin(action: () => Promise<void>, category?: string): Promise<void>;
  canUndo(): Promise<boolean>;
  canRedo(): Promise<boolean>;
  undo(): Promise<void>;
  redo(): Promise<void>;
}
