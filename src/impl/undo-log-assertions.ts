import { Action, Change, Channel, ChannelStatus } from "../tables";
import { UndoLogAssertions } from "../undo-log-assertions";
import { OldOrNew, UndoLogUtils } from "../undo-log-utils";
import { AssertionsImpl } from "./assertions";

export class UndoLogAssertionsImpl extends AssertionsImpl implements UndoLogAssertions {
  private undoLogUtils: UndoLogUtils;
  constructor(undoLogUtils: UndoLogUtils) {
    super(undoLogUtils);
    this.undoLogUtils = undoLogUtils;
  }

  async assertChannelInStatus(channelId: number, status: ChannelStatus): Promise<Channel> {
    const channel = await this.undoLogUtils.getChannel(channelId);
    this.assertTrue(channel != null, `Expected a channel ${channelId}, but was not found.`)
    this.assertTrue(channel!.status === status, `Expected channel ${channelId} to be in status '${status}', but was in status '${channel!.status}'.`);
    return channel!;
  }

  async assertChannelHasActions(channel: Channel, numberOfActions: number): Promise<Action[]> {
    const actions = await this.undoLogUtils.getActionsOfChannel(channel);
    this.assertTrue(actions.length === numberOfActions, `Expected channel ${channel.id} to have ${numberOfActions} actions, but has ${actions.length} actions.`);
    return actions;
  }

  async assertActionHasChanges(action: Action, numberOfChanges: number): Promise<Change[]> {
    const changes = await this.undoLogUtils.getChangesOfAction(action);
    this.assertTrue(
      changes.length === numberOfChanges, 
      `Expected action ${action.id} to have ${numberOfChanges} changes, but has ${changes.length} changes.`
    );
    return changes;
  }
  
  async assertChangeHasValues<T extends Record<string, any>>(change: Change, type: OldOrNew, expected: Partial<T>): Promise<void> {
    const actual = await this.undoLogUtils.getValuesOfChange(change, type);
    const expectedNames = Object.getOwnPropertyNames(expected);
    const errors: string[] = [];
    expectedNames.forEach(n => {
      if(expected[n] !== actual[n]) {
        errors.push(`Expected change ${change.id} to have ${type} value "${expected[n]}" for column "${n}", but "${actual[n]}" was found.`);
      }
    });
    this.assertTrue(errors.length === 0, errors.join("\r\n"));
  }
}