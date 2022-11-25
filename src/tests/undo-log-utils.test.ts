import { Channel, Changes, Channels } from "../undo-log-tables";
import { setupBeforeEach } from "./fixtures";
import { Connection } from "../sqlite3";
import { Assertions } from "../assertions";
import { SetupServices } from "../utils/setup-services";
import { TableServices } from "../utils/table-services";
import { TeardownServices } from "../utils/teardown-services";
import { ChannelServices } from "../utils/channel-services";

describe("UndoLogUtils", () => {
  let connection: Connection;
  let assertions: Assertions;
  let setup: SetupServices;
  let tables: TableServices;
  let teardown: TeardownServices;
  let channels: ChannelServices;

  beforeEach(async () => {
    ({ assertions, connection, setup, tables, teardown, channels } = await setupBeforeEach());
  });

  afterEach(async () => {
    await connection.close();
  });
    
  describe("createUndoLogTable", () => {
    test("table gets created", async () => {
      // arrange
      const name = "dummy";

      // act
      await setup.createUndoLogTable(name, Changes);

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
      await teardown.dropUndoLogTable("xxx");

      // assert
      await assertions.assertTableDoesNotExist("undo_xxx");
    });
  });
  describe("createChannel", () => {
    test("channel already exists, wrong state", async () => {
      // arrange
      await setup.createUndoLogTable("channels", Channels);
      await tables.insertIntoUndoLogTable<Channel>("channels", {
        id: 12345,
        status: "RECORDING",
      });

      // act
      const action = async () => await channels.getOrCreateReadyChannel(12345);

      // assert
      expect(action).rejects.toThrowError();
    });

    test("channel already exists, correct state", async () => {
      // arrange
      await setup.createUndoLogTable("channels", Channels);
      await tables.insertIntoUndoLogTable<Channel>("channels", {
        id: 12345,
        status: "READY",
      });

      // act
      await channels.getOrCreateReadyChannel(12345);

      // assert
      await assertions.assertTableHas<Channel>("undo_channels", {
        id: 12345,
        status: "READY",
      });
    });

    test("no channel exists", async () => {
      // arrange
      await setup.createUndoLogTable("channels", Channels);

      // act
      await channels.getOrCreateReadyChannel(12345);

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
      await setup.createUndoLogTable("channels", Channels);
      await tables.insertIntoUndoLogTable<Channel>("channels", {
        id: 999,
        status: "RECORDING",
      });

      // act
      await channels.updateChannel(999, "UNDOING");

      // assert
      await assertions.assertTableHas<Channel>("undo_channels", {
        id: 999,
        status: "UNDOING",
      });
    });
  });
});
