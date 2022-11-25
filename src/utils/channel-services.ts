import { ChannelStatus, Channel } from "../undo-log-tables";


export interface ChannelServices {
  getOrCreateReadyChannel(channelId: number): Promise<void>;
  updateChannel(channelId: number, status: ChannelStatus): Promise<void>;
  getChannel(channelId: number): Promise<Channel | null>;
}
