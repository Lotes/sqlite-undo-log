import {
  InitializeMultipleOptions,
  InitializeMultipleResult,
  UndoLogConstructorOptions,
  UndoLogPublic,
  UndoLogSetupPublic,
} from "..";
import { Connection } from "../sqlite3";
import _ from "lodash";
import { UndoLogImpl } from "./undo-log";
import { UndoLogUtils } from "../undo-log-utils";
import { UndoLog } from "../undo-log";
import { UndoLogSetup } from "../undo-log-setup";

export class UndoLogSetupPublicImpl implements UndoLogSetupPublic {
  constructor(private utils: UndoLogUtils, private setup: UndoLogSetup, private apiLogFactory: (channelId: number) => UndoLogPublic) {}
  async initializeMultiple(
    options: InitializeMultipleOptions
  ): Promise<InitializeMultipleResult> {
    const excludedTableNames = await this.setup.install();
    const result: InitializeMultipleResult = {};
    for (const [key, value] of Object.entries(options)) {
      const channelId = typeof key === "number" ? key : parseInt(key, 10);
      const tables = typeof value === "string" ? [value] : value;
      for (const tableName of _.difference(tables, excludedTableNames)) {
        await this.setup.addTable(tableName, channelId);
        excludedTableNames.push(tableName);
      }
      result[channelId] = this.apiLogFactory(channelId);
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
    return this.apiLogFactory(channelId);
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
    return status.status === "READY" && status.undos > 0;
  }
  async canRedo(): Promise<boolean> {
    const status = await this.undoLog.status(this.channelId);
    return status.status === "READY" && status.redos > 0;
  }
  async undo(): Promise<void> {
    await this.undoLog.undo(this.channelId);
  }
  async redo(): Promise<void> {
    await this.undoLog.redo(this.channelId);
  }
}
