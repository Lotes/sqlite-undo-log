import { DatabaseImpl } from "./impl/sqlite3";
import { Connection, Database, UndoLogUtils, Assertions } from "./types";
import path from "path";
import {promises} from "fs";
import { UndoLogUtilsImpl } from "./impl/undo-log-utils";
import { AssertionsImpl } from "./impl/assertions";

let connection: Connection;
let utils: UndoLogUtils;
let assertions: Assertions;

beforeEach(async () => {
  const fileName = path.join(__dirname, "..", "..", "output", expect.getState().currentTestName + ".sqlite3");
  await promises.rm(fileName);
  const database: Database = new DatabaseImpl(fileName);
  connection = await database.connect();
  utils = new UndoLogUtilsImpl(connection);
  assertions = new AssertionsImpl(utils, true);
});

describe("UndoLogUtils", () => {
  describe("createUndoLogTable", () => {

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