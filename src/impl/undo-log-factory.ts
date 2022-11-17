import { UndoLogPublicImpl, UndoLogSetupPublicImpl } from ".";
import { UndoLogPublic, UndoLogSetupPublic } from "..";
import { Connection } from "../sqlite3";
import { UndoLogAssertions } from "../undo-log-assertions";
import { UndoLogFactory } from "../undo-log-factory";
import { UndoLogSetup } from "../undo-log-setup";
import { UndoLogUtils } from "../undo-log-utils";
import { UndoLogAssertionsImpl } from "./undo-log-assertions";
import { UndoLogSetupImpl } from "./undo-log-setup";
import { UndoLogUtilsImpl } from "./undo-log-utils";

export class UndoLogFactoryImpl implements UndoLogFactory {
    constructor(private tablePrefix: string, private connection: Connection) {}
    createUtils(): UndoLogUtils {
        return new UndoLogUtilsImpl(this.connection, this.tablePrefix);
    }
    createAssertions(utils: UndoLogUtils): UndoLogAssertions {
        return new UndoLogAssertionsImpl(utils);
    }
    createSetup(utils: UndoLogUtils): UndoLogSetup {
        return new UndoLogSetupImpl(this.connection, utils, this.tablePrefix);
    }
    createPublicLogApi(utils: UndoLogUtils,  channelId: number): UndoLogPublic {
        return new UndoLogPublicImpl(this.connection, utils, {channelId, tablePrefix: this.tablePrefix})
    }
    createPublicSetupApi(): UndoLogSetupPublic {
        return new UndoLogSetupPublicImpl(this.connection, this.tablePrefix);
    }
} 