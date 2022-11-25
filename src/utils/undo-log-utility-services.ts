import { ActionServices } from "./action-services";
import { ChannelServices } from "./channel-services";
import { TableServices } from "./table-services";
import { ConfigurationServices } from "./configuration-services";
import { TeardownServices } from "./teardown-services";
import { SetupServices } from "./setup-services";
import { DatabaseUtilitiesServices } from "./database-utilities-services";
import { DatabaseQueryServices } from "./database-query-services";
import { DatabaseManipulationServices } from "./database-manipulation-services";
import { DatabaseDefinitionServices } from "./database-definition-services";

export interface UndoLogUtilityServices {
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
}
