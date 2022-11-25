import { UndoLogServices } from "../..";
import { Connection } from "../../sqlite3";
import {
  CleanUpTask,
  CleanUpTasks,
  CleanUpTaskType
} from "../../undo-log-tables";
import { TeardownServices } from "../../utils/teardown-services";

export class TeardownServicesImpl implements TeardownServices {
  private connection: Connection;
  private prefix: string;
  constructor(srv: UndoLogServices) {
    this.connection = srv.connection;
    this.prefix = srv.installations.prefix;
  }

  async dropUndoLogTable(tableName: string) {
    const query = `DROP TABLE ${this.prefix}${tableName}`;
    await this.connection.execute(query);
  }

  getCleanUpTasksRelatedTo(tableName: string): Promise<CleanUpTask[]> {
    return this.connection.getAll<CleanUpTask>(`
      SELECT *
      FROM ${this.prefix}${CleanUpTasks.name}
      WHERE ref_table_name = $tableName
    `, { $tableName: tableName });
  }

  getCleanUpTasksByType(taskType: CleanUpTaskType): Promise<CleanUpTask[]> {
    return this.connection.getAll<CleanUpTask>(`
      SELECT *
      FROM ${this.prefix}${CleanUpTasks.name}
      WHERE type = $type
    `, { $type: taskType });
  }

  async cleanUp(task: CleanUpTask): Promise<void> {
    if (task.type === "TRIGGER") {
      await this.connection.run(`DROP TRIGGER ${task.name}`);
    } else {
      await this.connection.run(`DROP TABLE ${task.name}`);
    }
  }

  async cleanUpAll(tasks: CleanUpTask[]): Promise<void> {
    for (const task of tasks) {
      await this.cleanUp(task);
    }
  }

}
