import { inject, Module } from "djinject";
import { SetupServicesImpl, TeardownServicesImpl, ConfigurationServicesImpl, TableServicesImpl, ChannelServicesImpl, ActionServicesImpl } from "../impl/undo-log-utils";
import { UtilsImpl } from "../impl/utils";
import { Connection } from "../sqlite3";
import { UndoLogUtilityServices } from "./undo-log-utility-services";
import { PrivateServices } from "./private-services";

function module(connection: Connection, prefix: string): Module<UndoLogUtilityServices & PrivateServices> {
  return {
    connection: () => connection,
    prefix: () => prefix,
    utils: srv => new UtilsImpl(srv.connection),
    setup: srv => new SetupServicesImpl(srv),
    teardown: srv => new TeardownServicesImpl(srv),
    config: srv => new ConfigurationServicesImpl(srv),
    tables: srv => new TableServicesImpl(srv),
    channels: srv => new ChannelServicesImpl(srv),
    actions: srv => new ActionServicesImpl(srv)  
  };
}

export function createUndoLogUtilityServices(connection: Connection, prefix: string): UndoLogUtilityServices {
  return inject(module(connection, prefix)) as UndoLogUtilityServices;
}