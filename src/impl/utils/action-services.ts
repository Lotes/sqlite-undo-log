import { Connection } from "../../sqlite3";
import {
  Action,
  Change,
  Channel
} from "../../undo-log-tables";
import { OldOrNew, ColumnValue, NameValueType } from "../../utilities";
import { ActionServices } from "../../utils/action-services";
import { PrivateServices } from "../../utils/private-services";
import { SetupServices } from "../../utils/setup-services";
import { UndoLogUtilityServices } from "../../utils/undo-log-utility-services";


export class ActionServicesImpl implements ActionServices {
  private connection: Connection;
  private prefix: string;
  private setup: SetupServices;

  constructor(srv: UndoLogUtilityServices & PrivateServices) {
    this.connection = srv.connection;
    this.prefix = srv.prefix;
    this.setup = srv.setup;
  }

  async getActionsOfChannel(channel: Channel): Promise<Action[]> {
    const query = `
      SELECT a.*
      FROM ${this.prefix}actions a
      WHERE a.channel_id=$channelId
      ORDER BY a.order_index DESC
    `;
    const parameters = {
      $channelId: channel.id,
    };
    return this.connection.getAll<Action>(query, parameters);
  }

  async getChangesOfAction(action: Action): Promise<Change[]> {
    const query = `
      SELECT ch.*
      FROM ${this.prefix}changes ch
      WHERE ch.action_id=$actionId
      ORDER BY ch.order_index
    `;
    const parameters = {
      $actionId: action.id,
    };
    return this.connection.getAll<Change>(query, parameters);
  }

  async getValuesOfChange(
    change: Change,
    type: OldOrNew
  ): Promise<Record<string, ColumnValue>> {
    const query = `
      SELECT c.name, v.${type}_value AS value, c.type
      FROM ${this.prefix}values v
        INNER JOIN ${this.prefix}columns c
        ON v.column_id=c.id
      WHERE v.change_id=$changeId
    `;
    const parameters = {
      $changeId: change.id,
    };
    const nameValues = await this.connection.getAll<NameValueType>(
      query,
      parameters
    );
    let record = {};
    nameValues.forEach(
      (nv) => (record = {
        ...record,
        [nv.name]: {
          value: nv.value,
          type: nv.type,
        },
      })
    );
    return record;
  }

  async markActionAsUndone(actionId: number, undone: boolean): Promise<void> {
    this.setup.updateUndoLogTable<Action>("actions", {
      id: actionId,
      undone,
    });
  }
}
