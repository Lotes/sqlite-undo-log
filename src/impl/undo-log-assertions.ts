import { Action, Change, Channel, ChannelStatus } from "../undo-log-tables";
import { UndoLogAssertions } from "../undo-log-assertions";
import { OldOrNew, Utils } from "../utils";
import { AssertionsImpl } from "./assertions";
import { UndoLogUtilityServices } from "../undo-log-utils";
import { Assertions } from "../assertions";

export class UndoLogAssertionsImpl implements UndoLogAssertions {
  constructor(private undoLogUtils: UndoLogUtilityServices, private utils: Utils, private assertions: Assertions) {
  }

  async assertChannelInStatus(channelId: number, status: ChannelStatus): Promise<Channel> {
    const channel = await this.undoLogUtils.channels.getChannel(channelId);
    this.assertions.assertTrue(channel != null, `Expected a channel ${channelId}, but was not found.`)
    this.assertions.assertTrue(channel!.status === status, `Expected channel ${channelId} to be in status '${status}', but was in status '${channel!.status}'.`);
    return channel!;
  }

  async assertChannelHasActions(channel: Channel, numberOfActions: number): Promise<Action[]> {
    const actions = await this.undoLogUtils.actions.getActionsOfChannel(channel);
    this.assertions.assertTrue(actions.length === numberOfActions, `Expected channel ${channel.id} to have ${numberOfActions} actions, but has ${actions.length} actions.`);
    return actions;
  }

  async assertActionHasChanges(action: Action, numberOfChanges: number): Promise<Change[]> {
    const changes = await this.undoLogUtils.actions.getChangesOfAction(action);
    this.assertions.assertTrue(
      changes.length === numberOfChanges, 
      `Expected action ${action.id} to have ${numberOfChanges} changes, but has ${changes.length} changes.`
    );
    return changes;
  }
  
  async assertChangeHasValues<T extends Record<string, any>>(change: Change, type: OldOrNew, expected: Partial<T>): Promise<void> {
    const quotedActual = await this.undoLogUtils.actions.getValuesOfChange(change, type);
    const actual = this.utils.unquote(quotedActual);
    const expectedNames = Object.getOwnPropertyNames(expected);
    const errors: string[] = [];
    expectedNames.forEach(n => {
      if(!this.utils.equals(expected[n], actual[n])) {
        errors.push(`Expected change ${change.id} to have ${type} value "${expected[n]}" for column "${n}", but "${actual[n]}" was found.`);
      }
    });
    this.assertions.assertTrue(errors.length === 0, errors.join("\r\n"));
  }
}