import { inject, Module } from "djinject";
import { UndoLogPublicImpl, UndoLogSetupPublicImpl } from "./impl";
import { Assertions } from "./assertions";
import { Connection } from "./sqlite3";
import { Delta, UndoLog } from "./undo-log";
import { UndoLogAssertions } from "./undo-log-assertions";
import { UndoLogSetup } from "./undo-log-setup";
import { createUndoLogUtilityServices } from "./utils/module";
import { UndoLogUtilityServices } from "./utils/undo-log-utility-services";
import { AssertionsImpl } from "./impl/assertions";
import { UndoLogImpl } from "./impl/undo-log";
import { UndoLogAssertionsImpl } from "./impl/undo-log-assertions";
import { UndoLogSetupImpl } from "./impl/undo-log-setup";

export interface UndoLogConnectionServices {
    prefix: string;
    connection: Connection;
    logUtils: UndoLogUtilityServices;
}

export interface UndoLogServices extends UndoLogConnectionServices {
    forceForeignKeys: boolean;
    logFactory: () => UndoLog;
    logSetup: UndoLogSetup;
    api: UndoLogSetupPublic;
    apiLogFactory: (channelId: number) => UndoLogPublic;
}

export interface UndoLogTestServices extends UndoLogServices {
    assertions: Assertions;
    logAssertions: UndoLogAssertions;
    log: UndoLog;
    apiLog: UndoLogPublic;
}

type UndoLogSVC = UndoLogServices;

function module(connection: Connection, prefix: string): Module<UndoLogServices, UndoLogServices> {
    const module: Module<UndoLogServices, UndoLogServices> = {
        forceForeignKeys:  () => true,
        prefix: () => prefix,
        connection: () => connection,
        logUtils: srv => createUndoLogUtilityServices(srv.connection, srv.prefix),
        logFactory: srv => () => new UndoLogImpl(srv),
        logSetup: srv => new UndoLogSetupImpl(srv),
        api: srv => new UndoLogSetupPublicImpl(srv),
        apiLogFactory: srv => (channelId: number) => new UndoLogPublicImpl(srv, channelId)
    };
    return module;
}

export function createUndoLogServices(connection: Connection, prefix: string) {
    return inject(module(connection, prefix)) as UndoLogServices & UndoLogConnectionServices;
}

function testModule(connection: Connection, prefix: string): Module<UndoLogTestServices> {
    return {
        ...module(connection, prefix),
        assertions: srv => new AssertionsImpl(srv),
        logAssertions: srv => new UndoLogAssertionsImpl(srv),
        log: srv => srv.logFactory(),
        apiLog: srv => srv.apiLogFactory(0)
    };
}

export function createTestServices(connection: Connection, prefix: string) {
    return inject(testModule(connection, prefix)) as UndoLogTestServices;
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
