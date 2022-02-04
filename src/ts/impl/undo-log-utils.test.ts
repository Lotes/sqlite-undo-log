import { DatabaseImpl } from "./sqlite3";
import { Connection, Database, UndoLogUtils, Assertions } from "../types";
import path from "path";
import { promises } from "fs";
import { UndoLogUtilsImpl } from "./undo-log-utils";
import { AssertionsImpl } from "./assertions";
import tables, { Row } from "../tables";

let connection: Connection;
let utils: UndoLogUtils;
let assertions: Assertions;

beforeEach(async () => {
  const fileName = path.join(
    "output",
    expect.getState().currentTestName.replace(/\s+/g, "_") + ".sqlite3"
  );
  await promises.rm(fileName, { force: true });
  const database: Database = new DatabaseImpl(fileName);
  connection = await database.connect();
  utils = new UndoLogUtilsImpl(connection);
  assertions = new AssertionsImpl(utils);
});

describe("UndoLogUtils", () => {
  describe("createUndoLogTable", () => {
    test("table gets created", async () => {
      // arrange
      const name = "dummy";

      // act
      await utils.createUndoLogTable(name, tables.changes);

      // assert
      await assertions.assertTableExists("undo_dummy");
      for (const columnName of Object.keys(tables.changes.columns)) {
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
      await utils.createUndoLogTable("channels", tables.channels);
      await utils.insertIntoUndoLogTable<Row.Channel>("channels", {
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
      await utils.createUndoLogTable("channels", tables.channels);
      await utils.insertIntoUndoLogTable<Row.Channel>("channels", {
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
      await utils.createUndoLogTable("channels", tables.channels);

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
      await utils.createUndoLogTable("channels", tables.channels);
      await utils.insertIntoUndoLogTable<Row.Channel>("channels", {
        id: 999,
        status: "RECORDING"
      });
      
      // act
      await utils.updateChannel(999, "REDOING");

      // assert
      await assertions.assertTableHas<Row.Channel>("undo_channels", {
        id: 999,
        status: "REDOING"
      });
    });
  });
});
