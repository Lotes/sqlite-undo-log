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
import { Delta, UndoLog } from "../undo-log";
import { UndoLogSetup } from "../undo-log-setup";
import { UndoLogUtilityServices } from "../undo-log-utils";
import { Utils } from "../utils";

export class UndoLogSetupPublicImpl implements UndoLogSetupPublic {
  constructor(private utils: Utils, private setup: UndoLogSetup, private apiLogFactory: (channelId: number) => UndoLogPublic) {}
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
  async initializeSingle(channel?: number): Promise<UndoLogPublic> {
    const channelId = channel ?? 0;
    const logTableNames = await this.setup.install();
    const tables = _.difference(
      await this.utils.getAllTableNames(),
      logTableNames
    );
    await Promise.all(tables.map((n) => this.setup.addTable(n, channelId)));
    return this.apiLogFactory(channelId);
  }
}

export class UndoLogPublicImpl implements UndoLogPublic {
  private channelId: number;
  private undoLog: UndoLog;
  constructor(
    connection: Connection,
    logUtils: UndoLogUtilityServices,
    utils: Utils,
    { channelId, tablePrefix }: UndoLogConstructorOptions
  ) {
    this.channelId = channelId;
    this.undoLog = new UndoLogImpl(connection, logUtils, tablePrefix);
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
  undo(): Promise<Delta[]> {
    return this.undoLog.undo(this.channelId);
  }
  redo(): Promise<Delta[]> {
    return this.undoLog.redo(this.channelId);
  }
}
