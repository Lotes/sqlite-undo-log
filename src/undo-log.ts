export interface UndoLog {
  recordWithin(
    channel: number,
    categoryName: string | undefined,
    action: () => Promise<void>
  ): Promise<void>;
  undo(channel: number): Promise<void>;
}
