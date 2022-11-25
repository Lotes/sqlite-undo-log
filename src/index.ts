import { inject, Module } from "djinject";
import { UndoLogPublicImpl, UndoLogSetupPublicImpl } from "./impl";
import { Assertions } from "./assertions";
import { Connection } from "./sqlite3";
import { Delta, UndoLog } from "./undo-log";
import { UndoLogAssertions } from "./undo-log-assertions";
import { UndoLogSetup } from "./undo-log-setup";
import { AssertionsImpl } from "./impl/assertions";
import { UndoLogImpl } from "./impl/undo-log";
import { UndoLogAssertionsImpl } from "./impl/undo-log-assertions";
import { UndoLogSetupImpl } from "./impl/undo-log-setup";
import { ActionServices } from "./utils/action-services";
import { ChannelServices } from "./utils/channel-services";
import { ConfigurationServices } from "./utils/configuration-services";
import { DatabaseDefinitionServices } from "./utils/database-definition-services";
import { DatabaseManipulationServices } from "./utils/database-manipulation-services";
import { DatabaseQueryServices } from "./utils/database-query-services";
import { DatabaseUtilitiesServices } from "./utils/database-utilities-services";
import { SetupServices } from "./utils/setup-services";
import { TableServices } from "./utils/table-services";
import { TeardownServices } from "./utils/teardown-services";
import { ActionServicesImpl } from "./impl/utils/action-services";
import { ChannelServicesImpl } from "./impl/utils/channel-services";
import { ConfigurationServicesImpl } from "./impl/utils/configuration-services";
import { DatabaseDefinitionServicesImpl } from "./impl/utils/database-definition-services";
import { DatabaseManipulationServicesImpl } from "./impl/utils/database-manipulation-services";
import { DatabaseQueryServicesImpl } from "./impl/utils/database-query-services";
import { DatabaseUtilitiesServicesImpl } from "./impl/utils/database-utilities-services";
import { SetupServicesImpl } from "./impl/utils/setup-services";
import { TableServicesImpl } from "./impl/utils/table-services";
import { TeardownServicesImpl } from "./impl/utils/teardown-services";

export interface UndoLogConnectionServices {
  prefix: string;
  connection: Connection;
}

export interface UndoLogServices extends UndoLogConnectionServices {
  setup: SetupServices;
  teardown: TeardownServices;
  config: ConfigurationServices;
  tables: TableServices;
  channels: ChannelServices;
  actions: ActionServices;
  databases: {
    definition: DatabaseDefinitionServices;
    manipulation: DatabaseManipulationServices;
    query: DatabaseQueryServices;
    utils: DatabaseUtilitiesServices;
  };
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

function module(
  connection: Connection,
  prefix: string
): Module<UndoLogServices, UndoLogServices> {
  const module: Module<UndoLogServices, UndoLogServices> = {
    forceForeignKeys: () => true,
    prefix: () => prefix,
    connection: () => connection,
    logFactory: (srv) => () => new UndoLogImpl(srv),
    logSetup: (srv) => new UndoLogSetupImpl(srv),
    api: (srv) => new UndoLogSetupPublicImpl(srv),
    apiLogFactory: (srv) => (channelId: number) => new UndoLogPublicImpl(srv, channelId),
    setup: srv => new SetupServicesImpl(srv),
    teardown: srv => new TeardownServicesImpl(srv),
    config: srv => new ConfigurationServicesImpl(srv),
    tables: srv => new TableServicesImpl(srv),
    channels: srv => new ChannelServicesImpl(srv),
    actions: srv => new ActionServicesImpl(srv),
    databases: {
      definition: srv => new DatabaseDefinitionServicesImpl(srv),
      manipulation: srv => new DatabaseManipulationServicesImpl(srv),
      query: srv => new DatabaseQueryServicesImpl(srv),
      utils: srv => new DatabaseUtilitiesServicesImpl(srv),
    }
  };
  return module;
}

export function createUndoLogServices(connection: Connection, prefix: string) {
  return inject(module(connection, prefix)) as UndoLogServices &
    UndoLogConnectionServices;
}

function testModule(
  connection: Connection,
  prefix: string
): Module<UndoLogTestServices> {
  return {
    ...module(connection, prefix),
    assertions: (srv) => new AssertionsImpl(srv),
    logAssertions: (srv) => new UndoLogAssertionsImpl(srv),
    log: (srv) => srv.logFactory(),
    apiLog: (srv) => srv.apiLogFactory(0),
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
