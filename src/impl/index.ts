import {
  InitializeMultipleOptions,
  InitializeMultipleResult,
  UndoLogConstructorOptions,
  UndoLogPublic,
  UndoLogSetupPublic,
} from "..";
import { Connection } from "../sqlite3";
import { UndoLogSetupImpl } from "./undo-log-setup";
import { UndoLogUtilsImpl } from "./undo-log-utils";
import _ from "lodash";
import { UndoLogImpl } from "./undo-log";
import { UndoLogUtils } from "../undo-log-utils";
import { UndoLog } from "../undo-log";

export class UndoLogSetupPublicImpl implements UndoLogSetupPublic {
  private utils: UndoLogUtilsImpl;
  private setup: UndoLogSetupImpl;
  constructor(private connection: Connection, private tablePrefix = "undo_") {
    this.utils = new UndoLogUtilsImpl(this.connection, this.tablePrefix);
    this.setup = new UndoLogSetupImpl(
      this.connection,
      this.utils,
      this.tablePrefix
    );
  }
  async initializeMultiple(
    options: InitializeMultipleOptions
  ): Promise<InitializeMultipleResult> {
    await this.setup.install();
    const result: InitializeMultipleResult = {};
    for (const [key, value] of Object.entries(options)) {
      const channelId = typeof key === "number" ? key : parseInt(key, 10);
      const tables = typeof value === "string" ? [value] : value;
      for (const tableName of tables) {
        await this.setup.addTable(tableName, channelId);
      }
      result[channelId] = new UndoLogPublicImpl(this.connection, this.utils, {
        channelId,
        tablePrefix: this.tablePrefix,
      });
    }
    return result;
  }
  async initializeSingle(channelId: number): Promise<UndoLogPublic> {
    const logTableNames = await this.setup.install();
    const tables = _.difference(
      await this.utils.getAllTableNames(),
      logTableNames
    );
    tables.forEach((n) => this.setup.addTable(n, channelId));
    return new UndoLogPublicImpl(this.connection, this.utils, {
      tablePrefix: this.tablePrefix,
      channelId,
    });
  }
}

export class UndoLogPublicImpl implements UndoLogPublic {
  private channelId: number;
  private undoLog: UndoLog;
  constructor(
    connection: Connection,
    utils: UndoLogUtils,
    { channelId, tablePrefix }: UndoLogConstructorOptions
  ) {
    this.channelId = channelId;
    this.undoLog = new UndoLogImpl(connection, utils, tablePrefix);
  }
  private startTracking(category?: string): Promise<void> {
    return this.undoLog.startTracking(this.channelId, category);
  }
  private stopTracking(): Promise<void> {
    return this.undoLog.startTracking(this.channelId);
  }
  async trackWithin(
    action: () => Promise<void>,
    category?: string
  ): Promise<void> {
    await this.startTracking(category);
    try {
      await action();
    } finally {
      await this.stopTracking();
    }
  }
  async canUndo(): Promise<boolean> {
    const status = await this.undoLog.status(this.channelId);
    return status.undos > 0;
  }
  async canRedo(): Promise<boolean> {
    const status = await this.undoLog.status(this.channelId);
    return status.redos > 0;
  }
  async undo(): Promise<void> {
    await this.undoLog.undo(this.channelId);
  }
  async redo(): Promise<void> {
    await this.undoLog.redo(this.channelId);
  }
}
