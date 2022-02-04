import { DatabaseImpl } from "./sqlite3";
import { Connection, Database, UndoLogUtils, Assertions } from "../types";
import path from "path";
import {promises} from "fs";
import { UndoLogUtilsImpl } from "./undo-log-utils";
import { AssertionsImpl } from "./assertions";
import tables from "../tables";

let connection: Connection;
let utils: UndoLogUtils;
let assertions: Assertions;

beforeEach(async () => {
  const fileName = path.join("output", expect.getState().currentTestName.replace(/\s+/g, "_") + ".sqlite3");
  await promises.rm(fileName, {force: true});
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
      await assertions.assertColumnExists("undo_dummy", "id");
      Object.keys(tables.channels.columns).forEach(async name => {
        await assertions.assertColumnExists("undo_dummy", name);
      });
    });
  });
  describe("dropUndoLogTable", () => {
    
  });
  describe("createChannel", () => {
    
  });
  describe("updateChannel", () => {
    
  });
  describe("cellToString", () => {
    
  });
  describe("insertIntoTable", () => {
    
  });
  describe("getMetaTable", () => {
    
  });
  describe("doesTableExist", () => {
    
  });
  describe("hasTableId", () => {
    
  });
});