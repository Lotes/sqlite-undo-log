import { Action, Change, Channel, ChannelStatus } from "./tables";
import { Assertions, OldOrNew, UndoLogUtils } from "./types";

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class AssertionsImpl implements Assertions {
  private utils: UndoLogUtils;
  constructor(utils: UndoLogUtils) {
    this.utils = utils;
  }
  async assertColumnExists(tableName: string, columnName: string): Promise<void> {
    const exists = await this.utils.doesColumnExist(tableName, columnName);
    this.assertTrue(exists, `Expected column '${tableName}.${columnName}' was not found.`);
  }
  assertTrue(value: boolean, message: string) {
    if (!value) {
      throw new AssertionError(message);
    }
  }
  assertFalse(value: boolean, message: string) {
    this.assertTrue(!value, message);
  }
  async assertTableExists(tableName: string) {
    const result = await this.utils.doesTableExist(tableName);
    this.assertTrue(result, `Expected table '${tableName}', but was not found.`);
  }
  async assertTableDoesNotExist(tableName: string) {
    const result = await this.utils.doesTableExist(tableName);
    this.assertFalse(
      result,
      `Expected table '${tableName}' to be gone, but was found.`
    );
  }

  async assertTableHasId(tableName: string, id: number) {
    const result = await this.utils.hasTableId(tableName, id);
    this.assertTrue(
      result,
      `Expected table '${tableName}' to have entry with id ${id}, but was not found.`
    );
  }
  
  async assertTableHas<T extends Record<string, any> & {id: number}>(tableName: string, row: T) {
    const result = await this.utils.tableHas(tableName, row);
    this.assertTrue(
      result,
      `Expected table '${tableName}' to have entry with ${JSON.stringify(row)}.`
    );
  }

  async assertChannelInStatus(channelId: number, status: ChannelStatus): Promise<Channel> {
    const channel = await this.utils.getChannel(channelId);
    this.assertTrue(channel != null, `Expected a channel ${channelId}, but was not found.`)
    this.assertTrue(channel!.status === status, `Expected channel ${channelId} to be in status '${status}', but was in status '${channel!.status}'.`);
    return channel!;
  }

  async assertChannelHasActions(channel: Channel, numberOfActions: number): Promise<Action[]> {
    const actions = await this.utils.getActionsOfChannel(channel);
    this.assertTrue(actions.length === numberOfActions, `Expected channel ${channel.id} to have ${numberOfActions} actions, but has ${actions.length} actions.`);
    return actions;
  }

  async assertActionHasChanges(action: Action, numberOfChanges: number): Promise<Change[]> {
    const changes = await this.utils.getChangesOfAction(action);
    this.assertTrue(
      changes.length === numberOfChanges, 
      `Expected action ${action.id} to have ${numberOfChanges} changes, but has ${changes.length} changes.`
    );
    return changes;
  }
  
  async assertChangeHasValues<T extends Record<string, any>>(change: Change, type: OldOrNew, expected: Partial<T>): Promise<void> {
    const actual = await this.utils.getValuesOfChange(change, type);
    const expectedNames = Object.getOwnPropertyNames(expected);
    const actualNames = Object.getOwnPropertyNames(actual);
    const allNames = [...new Set([...expectedNames, ...actualNames])];
    const errors: string[] = [];
    allNames.forEach(n=> {
      if(expected[n] !== actual[n]) {
        errors.push(`Expected change ${change.id} to have ${type} value "${expected[n]}" for column "${n}", but "${actual[n]}" was found.`);
      }
    });
    this.assertTrue(errors.length === 0, errors.join("\r\n"));
  }
}