import {
  CleanUpTask,
  CleanUpTaskType
} from "../undo-log-tables";


export interface TeardownServices {
  dropUndoLogTable(tableName: string): Promise<void>;
  getCleanUpTasksRelatedTo(tableName: string): Promise<CleanUpTask[]>;
  getCleanUpTasksByType(taskType: CleanUpTaskType): Promise<CleanUpTask[]>;
  cleanUp(task: CleanUpTask): Promise<void>;
  cleanUpAll(tasks: CleanUpTask[]): Promise<void>;
}
