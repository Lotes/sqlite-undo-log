import { UndoLogFactoryImpl } from "../impl/undo-log-factory";
import { Connection } from "../sqlite3";
import { UndoLogAssertions } from "../undo-log-assertions";
import { UndoLogFactory } from "../undo-log-factory";
import { Utils } from "../utils";
import { setupBeforeEach } from "./fixtures";

describe("Public API", () => {
    let connection: Connection;
    let utils: Utils;
    let assertions: UndoLogAssertions;
  
    beforeEach(async () => {
      ({ assertions, utils, connection } = await setupBeforeEach());
      
    });
  
    afterEach(async () => {
      await connection.close();
    });
  
    describe("lol", () => {

    });
});