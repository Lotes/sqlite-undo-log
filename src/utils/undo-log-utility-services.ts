import { Utils } from "../utilities";
import { ActionServices } from "./action-services";
import { ChannelServices } from "./channel-services";
import { TableServices } from "./table-services";
import { ConfigurationServices } from "./configuration-services";
import { TeardownServices } from "./teardown-services";
import { SetupServices } from "./setup-services";


export interface UndoLogUtilityServices {
  setup: SetupServices;
  teardown: TeardownServices;
  config: ConfigurationServices;
  tables: TableServices;
  channels: ChannelServices;
  actions: ActionServices;
  utils: Utils;
}
