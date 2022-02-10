import { Channel, Changes, Channels } from "../tables";
import { setupBeforeEach } from "./fixtures";
import { Connection } from "../sqlite3";
import { UndoLogAssertions } from "../undo-log-assertions";
import { UndoLogUtils } from "../undo-log-utils";

describe("UndoLogUtils", () => {
  let connection: Connection;
  let utils: UndoLogUtils;
  let assertions: UndoLogAssertions;

  beforeEach(async () => {
    ({ assertions, utils, connection } = await setupBeforeEach());
  });

  afterEach(async () => {
    connection.close();
  });
    
  describe("createUndoLogTable", () => {
    test("table gets created", async () => {
      // arrange
      const name = "dummy";

      // act
      await utils.createUndoLogTable(name, Changes);

      // assert
      await assertions.assertTableExists("undo_dummy");
      for (const columnName of Object.keys(Changes.columns)) {
        await assertions.assertColumnExists("undo_dummy", columnName);
      }
    });
  });
  describe("dropUndoLogTable", () => {
    test("drops table", async () => {
      // arrange
      await connection.execute(`CREATE TABLE undo_xxx (id INTEGER)`);

      // act
      await utils.dropUndoLogTable("xxx");

      // assert
      await assertions.assertTableDoesNotExist("undo_xxx");
    });
  });
  describe("createChannel", () => {
    test("channel already exists, wrong state", async () => {
      // arrange
      await utils.createUndoLogTable("channels", Channels);
      await utils.insertIntoUndoLogTable<Channel>("channels", {
        id: 12345,
        status: "RECORDING",
      });

      // act
      const action = async () => await utils.getOrCreateReadyChannel(12345);

      // assert
      expect(action).rejects.toThrowError();
    });

    test("channel already exists, correct state", async () => {
      // arrange
      await utils.createUndoLogTable("channels", Channels);
      await utils.insertIntoUndoLogTable<Channel>("channels", {
        id: 12345,
        status: "READY",
      });

      // act
      await utils.getOrCreateReadyChannel(12345);

      // assert
      await assertions.assertTableHas("undo_channels", {
        id: 12345,
        status: "READY",
      });
    });

    test("no channel exists", async () => {
      // arrange
      await utils.createUndoLogTable("channels", Channels);

      // act
      await utils.getOrCreateReadyChannel(12345);

      // assert
      await assertions.assertTableHas("undo_channels", {
        id: 12345,
        status: "READY",
      });
    });
  });

  describe("updateChannel", () => {
    test("updates existing channel", async () => {
      // arrange
      await utils.createUndoLogTable("channels", Channels);
      await utils.insertIntoUndoLogTable<Channel>("channels", {
        id: 999,
        status: "RECORDING",
      });

      // act
      await utils.updateChannel(999, "REDOING");

      // assert
      await assertions.assertTableHas<Channel>("undo_channels", {
        id: 999,
        status: "REDOING",
      });
    });
  });
});
