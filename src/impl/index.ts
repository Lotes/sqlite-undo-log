import { InitializeOptions, LogOptions, StartOptions, UndoLogConstructorOptions, UndoLogPublic, UndoLogSetupPublic } from "..";
import { Connection } from "../sqlite3";
import { UndoLogSetupImpl } from "./undo-log-setup";
import { UndoLogUtilsImpl } from "./undo-log-utils";
import _ from "lodash";
import { UndoLogImpl } from "./undo-log";
import { UndoLogUtils } from "../undo-log-utils";
import { UndoLog } from "../undo-log";

export class UndoLogSetupPublicImpl implements UndoLogSetupPublic {
  private connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;
  }
  async initialize({
    excludedTableNames = [],
    tablePrefix = "undo_",
    channelId = 0,
  }: InitializeOptions): Promise<UndoLogPublic> {
    const utils = new UndoLogUtilsImpl(this.connection, tablePrefix);
    const setup = new UndoLogSetupImpl(this.connection, utils, tablePrefix);
    
    const logTableNames = await setup.install();
    
    const tables = _.difference(await utils.getAllTableNames(), logTableNames, excludedTableNames);
    tables.forEach(n => setup.addTable(n, channelId));

    return new UndoLogPublicImpl(this.connection, utils, {tablePrefix, defaultChannelId: channelId});
  }
}

export class UndoLogPublicImpl implements UndoLogPublic {
  private defaultChannelId: number;
  private undoLog: UndoLog;
  constructor(connection: Connection, utils: UndoLogUtils, {defaultChannelId = 0, tablePrefix}: UndoLogConstructorOptions) {
    this.defaultChannelId = defaultChannelId;
    this.undoLog = new UndoLogImpl(connection, utils, tablePrefix);
  }
  private startTracking(options?: StartOptions | undefined): Promise<void> {
    options = {channelId: this.defaultChannelId, ...options} as StartOptions; 
    return this.undoLog.startTracking(options.channelId, options.category);
  }
  private stopTracking(options?: LogOptions | undefined): Promise<void> {
    options = {channelId: this.defaultChannelId, ...options} as LogOptions; 
    return this.undoLog.startTracking(options.channelId);
  }
  async trackWithin(action: () => Promise<void>, options?: StartOptions | undefined): Promise<void> {
    await this.startTracking(options);
    try {
      await action();
    } finally {
      await this.stopTracking(options);
    }
  }
  async canUndo(options?: LogOptions | undefined): Promise<boolean> {
    options = {channelId: this.defaultChannelId, ...options} as LogOptions; 
    const status = await this.undoLog.status(options.channelId);
    return status.undos > 0;
  }
  async canRedo(options?: LogOptions | undefined): Promise<boolean> {
    options = {channelId: this.defaultChannelId, ...options} as LogOptions; 
    const status = await this.undoLog.status(options.channelId);
    return status.redos > 0;
  }
  async undo(options?: LogOptions | undefined): Promise<void> {
    options = {channelId: this.defaultChannelId, ...options} as LogOptions; 
    await this.undoLog.undo(options.channelId);
  }
  async redo(options?: LogOptions | undefined): Promise<void> {
    options = {channelId: this.defaultChannelId, ...options} as LogOptions; 
    await this.undoLog.redo(options.channelId);
  }  
}
