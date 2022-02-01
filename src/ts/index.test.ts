import { DatabaseImpl } from "./impl/sqlite3-impl";
import { Connection, Database } from "./types";
import { UndoLogImpl, UndoLogSetupImpl } from "./impl/undo-log-impl";
import { doesTableExist } from "./testing/assertions";
import { createTable, insertIntoTable } from "./utils";
import { AllTypeTable } from "./testing/fixtures";
import { UndoLog, UndoLogSetup } from "./undo-log";
import tables, { Row } from "./tables";

const database: Database = new DatabaseImpl();
let connection: Connection;
let setup: UndoLogSetup;
let log: UndoLog;

beforeEach(async () => {
  connection = await database.connect();
  setup = new UndoLogSetupImpl(connection);
  log = new UndoLogImpl(connection);
  await setup.install();
});

afterEach(() => {

});

test("all tables are ready", async () => {
  const expected = Object.getOwnPropertyNames(tables);
  const actual = await Promise.all(expected.map(async (name) => (await doesTableExist(connection, "undo_" + name)) ? name : null));
  expect(actual).toStrictEqual(expected);
});

test("insertion works", async () => {
  // arrange
  await createTable(connection, "all_types", AllTypeTable.Definition);
  await setup.addTable("all_types", 0);
  await log.next(0);

  // act
  await insertIntoTable(connection, "all_types", AllTypeTable.Values[0]);

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
  await createTable(connection, "all_types", AllTypeTable.Definition);
  await setup.addTable("all_types", 0);
  await log.next(0);
  await insertIntoTable(connection, "all_types", AllTypeTable.Values[0]);

  // act
  await log.undo(0);

  // assert
  const rows = await connection.getAll("SELECT * FROM all_types");
  expect(rows).toEqual([]);
});


test.todo("deletion works");
test.todo("update works");