export interface InitializeOptions {
  excludedTableNames?: string[];
  tablePrefix?: string;
  channelId?: number;
}

export interface UndoLogSetupPublic {
  initialize(options: InitializeOptions): Promise<UndoLogPublic>;
}

export interface LogOptions {
  channelId: number;
}

export interface StartOptions extends LogOptions {
  category: string;
}

export interface UndoLogConstructorOptions {
  tablePrefix: string;
  defaultChannelId?: number;
}

export interface UndoLogPublic {
  trackWithin(action: () => Promise<void>, options?: StartOptions): Promise<void>;
  canUndo(options?: LogOptions): Promise<boolean>;
  canRedo(options?: LogOptions): Promise<boolean>;
  undo(options?: LogOptions): Promise<void>;
  redo(options?: LogOptions): Promise<void>;
}