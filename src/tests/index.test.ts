import { UndoLogPublic, UndoLogSetupPublic } from "..";
import { Connection } from "../sqlite3";
import { UndoLogAssertions } from "../undo-log-assertions";
import { UndoLogUtils } from "../undo-log-utils";
import { setupBeforeEach } from "./fixtures";

describe("Public API single channel", () => {
    let connection: Connection;
    let logUtils: UndoLogUtils;
    let logAssertions: UndoLogAssertions;
    let api: UndoLogSetupPublic;
    let log: UndoLogPublic;
  
    beforeEach(async () => {
      ({ logAssertions, logUtils, connection, api } = await setupBeforeEach());
      log = await api.initializeSingle(0);
    });
  
    afterEach(async () => {
      await connection.close();
    });

    test('TODO', () => {
      
    });
});