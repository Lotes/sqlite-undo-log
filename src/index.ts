import { inject, Module } from "djinject";
import { UndoLogPublicImpl, UndoLogSetupPublicImpl } from "./impl";
import { Assertions } from "./assertions";
import { Connection } from "./sqlite3";
import { Delta, UndoLog } from "./undo-log";
import { UndoLogAssertions } from "./undo-log-assertions";
import { UndoLogSetup } from "./undo-log-setup";
import { UndoLogUtils } from "./undo-log-utils";
import { Utils } from "./utils";
import { AssertionsImpl } from "./impl/assertions";
import { UndoLogImpl } from "./impl/undo-log";
import { UndoLogAssertionsImpl } from "./impl/undo-log-assertions";
import { UndoLogSetupImpl } from "./impl/undo-log-setup";
import { UndoLogUtilsImpl } from "./impl/undo-log-utils";
import { UtilsImpl } from "./impl/utils";

export interface UndoLogConnectionServices {
    prefix: string|undefined;
    connection: Connection;
    logUtils: UndoLogUtils;
}

export interface UndoLogServices {
    logFactory: () => UndoLog;
    logSetup: UndoLogSetup;
    api: UndoLogSetupPublic;
    apiLogFactory: (channelId: number) => UndoLogPublic;
}

export interface UndoLogTestServices {
    utils: Utils;
    assertions: Assertions;
    logAssertions: UndoLogAssertions;
    log: UndoLog;
    apiLog: UndoLogPublic;
}

function module(connection: Connection, prefix?: string): Module<UndoLogServices & UndoLogConnectionServices> {
    return {
        prefix:  () => prefix,
        connection: () => connection,
        logUtils: srv => new UndoLogUtilsImpl(srv.connection, srv.prefix),
        logFactory:  srv => () => new UndoLogImpl(srv.connection, srv.logUtils, srv.prefix),
        logSetup: srv => new UndoLogSetupImpl(srv.connection, srv.logUtils, srv.prefix),
        api: srv => new UndoLogSetupPublicImpl(srv.utils, srv.logSetup, srv.apiLogFactory),
        apiLogFactory: srv => (channelId: number) => new UndoLogPublicImpl(srv.connection, srv.logUtils, {channelId, tablePrefix: srv.prefix})
    };
}

export function createUndoLogServices(connection: Connection, prefix?: string) {
    return inject(module(connection, prefix)) as UndoLogServices & UndoLogConnectionServices;
}

function testModule(connection: Connection, prefix: string): Module<UndoLogTestServices & UndoLogConnectionServices & UndoLogServices> {
    return {
        ...module(connection, prefix),
        utils: srv => new UtilsImpl(srv.connection),
        assertions:  srv => new AssertionsImpl(srv.utils),
        logAssertions: srv => new UndoLogAssertionsImpl(srv.logUtils),
        log: srv => srv.logFactory(),
        apiLog: srv => srv.apiLogFactory(0)
    };
}

export function createTestServices(connection: Connection, prefix: string) {
    return inject(testModule(connection, prefix)) as UndoLogTestServices & UndoLogConnectionServices & UndoLogServices;
}

export type InitializeMultipleOptions = Record<number, string | string[]>;
export type InitializeMultipleResult = Record<number, UndoLogPublic>;

export interface UndoLogSetupPublic {
  initializeSingle(channelId?: number): Promise<UndoLogPublic>;
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
  undo(): Promise<Delta[]>;
  redo(): Promise<Delta[]>;
}
