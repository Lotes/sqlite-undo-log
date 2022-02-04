import { DatabaseImpl } from "./sqlite3";
import { Assertions, Connection, Database, UndoLog, UndoLogSetup, UndoLogUtils } from "../types";
import { AllTypeTable } from "../testing/fixtures";
import tables, { Row } from "../tables";
import path from "path";
import {promises} from "fs";
import { UndoLogImpl } from "./undo-log";
import { UndoLogSetupImpl } from "./undo-log-setup";
import { UndoLogUtilsImpl } from "./undo-log-utils";
import { AssertionsImpl } from "./assertions";

let connection: Connection;
let setup: UndoLogSetup;
let log: UndoLog;
let utils: UndoLogUtils;
let assertions: Assertions;

beforeEach(async () => {
  const fileName = path.join("output", expect.getState().currentTestName.replace(/\s+/g, "_") + ".sqlite3");
  await promises.rm(fileName, {force: true});
  const database: Database = new DatabaseImpl(fileName);
  connection = await database.connect();
  utils = new UndoLogUtilsImpl(connection)
  assertions = new AssertionsImpl(utils);
  setup = new UndoLogSetupImpl(connection, utils);
  log = new UndoLogImpl(connection, utils);
  await setup.install();
});

test("all tables are ready", async () => {
  const expected = Object.getOwnPropertyNames(tables);
  const actual = await Promise.all(expected.map(async (name) => (await utils.doesTableExist("undo_" + name)) ? name : null));
  expect(actual).toStrictEqual(expected);
});

test("insertion works", async () => {
  // arrange
  await utils.createTable("all_types", AllTypeTable.Definition);
  await setup.addTable("all_types", 0);
  await log.recordWithin(0, undefined, async() => {
    // act
    await utils.insertIntoTable("all_types", AllTypeTable.Values[0]);
  });

  // assert
  const rows = await connection.getAll("SELECT column_id, new_value FROM undo_values");
  expect(rows).toEqual([
    {column_id: 0, new_value: 1},
    {column_id: 1, new_value: 'one'},
    {column_id: 2, new_value: 1},
    {column_id: 3, new_value: 'juan'},
    {column_id: 4, new_value: 0},
  ]);

  const actions = await connection.getAll<Row.Action>("SELECT * FROM undo_actions");
  expect(actions.length).toBe(1);

  const changes = await connection.getAll<Row.Change>("SELECT * FROM undo_changes");
  expect(changes.length).toBe(1);
});

test("undo of insertion works", async () => {
  // arrange
  await utils.createUndoLogTable("all_types", AllTypeTable.Definition);
  await setup.addTable("all_types", 0);
  await log.recordWithin(0, undefined, async () =>   {
    await utils.insertIntoTable("all_types", AllTypeTable.Values[0]);
  });

  // act
  await log.undo(0);

  // assert
  const rows = await connection.getAll("SELECT * FROM all_types");
  expect(rows).toEqual([]);
});