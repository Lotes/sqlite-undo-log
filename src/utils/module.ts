import { inject, Module } from "djinject";
import { ActionServicesImpl } from "../impl/utils/action-services";
import { ChannelServicesImpl } from "../impl/utils/channel-services";
import { TableServicesImpl } from "../impl/utils/table-services";
import { ConfigurationServicesImpl } from "../impl/utils/configuration-services";
import { TeardownServicesImpl } from "../impl/utils/teardown-services";
import { SetupServicesImpl } from "../impl/utils/setup-services";
import { Connection } from "../sqlite3";
import { UndoLogUtilityServices } from "./undo-log-utility-services";
import { PrivateServices } from "./private-services";
import { DatabaseDefinitionServicesImpl } from "../impl/utils/database-definition-services";
import { DatabaseManipulationServicesImpl } from "../impl/utils/database-manipulation-services";
import { DatabaseQueryServicesImpl } from "../impl/utils/database-query-services";
import { DatabaseUtilitiesServicesImpl } from "../impl/utils/database-utilities-services";

function module(connection: Connection, prefix: string): Module<UndoLogUtilityServices & PrivateServices> {
  return {
    connection: () => connection,
    prefix: () => prefix,
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
}

export function createUndoLogUtilityServices(connection: Connection, prefix: string): UndoLogUtilityServices {
  return inject(module(connection, prefix)) as UndoLogUtilityServices;
}