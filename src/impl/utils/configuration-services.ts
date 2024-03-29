import { UndoLogServices } from "../..";
import { Connection } from "../../sqlite3";
import { Configs } from "../../undo-log-tables";
import { ConfigurationServices } from "../../utils/configuration-services";


export class ConfigurationServicesImpl implements ConfigurationServices {
  private connection: Connection;
  private prefix: string;
  constructor(srv: UndoLogServices) {
    this.connection = srv.connection;
    this.prefix = srv.installations.prefix;
  }

  async getConfig(name: string): Promise<number> {
    const row = await this.connection.getSingle<{ value: number; }>(`
      SELECT value
      FROM ${this.prefix}${Configs.name}
      WHERE name=$name
      LIMIT 1
    `, { $name: name });
    return row?.value ?? 0;
  }

  async setConfig(name: string, value: number): Promise<void> {
    await this.connection.run(`
      INSERT OR REPLACE INTO ${this.prefix}${Configs.name} (name, value)
      VALUES ($name, $value)
    `, { $name: name, $value: value });
  }
}
