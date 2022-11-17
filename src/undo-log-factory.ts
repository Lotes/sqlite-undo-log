import { UndoLogPublic, UndoLogSetupPublic } from ".";
import { UndoLogAssertions } from "./undo-log-assertions";
import { UndoLogSetup } from "./undo-log-setup";
import { UndoLogUtils } from "./undo-log-utils";

export interface UndoLogFactory {
    createUtils(): UndoLogUtils;
    createAssertions(utils: UndoLogUtils): UndoLogAssertions;
    createSetup(utils: UndoLogUtils): UndoLogSetup;
    createPublicLogApi(utils: UndoLogUtils,  channelId: number): UndoLogPublic;
    createPublicSetupApi(): UndoLogSetupPublic;
}