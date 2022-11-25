import { Connection } from "../../sqlite3";
import { ChannelStatus, Channel, Channels } from "../../undo-log-tables";
import { UndoLogError } from "../../undo-log";
import { ChannelServices } from "../../utils/channel-services";
import { UndoLogServices } from "../..";
import { DatabaseManipulationServices } from "../../utils/database-manipulation-services";

export class ChannelServicesImpl implements ChannelServices {
  private connection: Connection;
  private prefix: string;
  private manipulations: DatabaseManipulationServices;
  constructor(srv: UndoLogServices) {
    this.connection = srv.connection;
    this.prefix = srv.installations.prefix;
    this.manipulations = srv.databases.manipulations;
  }

  async updateChannel(channelId: number, status: ChannelStatus) {
    await this.manipulations.updateTable<Channel>(`${this.prefix}${Channels.name}`, channelId, {
      status
    });
  }

  async getChannel(channelId: number): Promise<Channel | null> {
    return this.connection.getSingle<Channel>(
      `SELECT * FROM ${this.prefix}channels WHERE id=$channelId`,
      { $channelId: channelId }
    );
  }

  async getOrCreateReadyChannel(channel: number) {
    const parameters = { $channel: channel };
    await this.connection.run(
      `INSERT OR IGNORE INTO ${this.prefix}channels (id, status) VALUES ($channel, 'READY')`,
      parameters
    );
    const row = await this.connection.getSingle<Channel>(
      `SELECT * FROM ${this.prefix}channels WHERE id=$channel`,
      parameters
    );
    if (row == null) {
      throw new UndoLogError(`Unable to create or get a channel '${channel}'.`);
    }
    if (row.status !== "READY") {
      throw new UndoLogError(
        `Expected channel '${channel}' to have status 'READY', but was '${row.status}'.`
      );
    }
  }
}
