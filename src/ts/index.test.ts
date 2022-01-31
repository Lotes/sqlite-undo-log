import { DatabaseImpl } from "./impl/sqlite3-impl";
import { Connection, Database } from "./types";
import { UndoLogSetupImpl } from "./impl/undo-log-impl";
import { doesTableExist } from "./testing/assertions";
import { createTable, insertIntoTable } from "./utils";
import { AllTypeTable } from "./testing/fixtures";
import { UndoLogSetup } from "./undo-log";
import tables from "./tables";

const database: Database = new DatabaseImpl();
let connection: Connection;
let setup: UndoLogSetup;

beforeEach(async () => {
  connection = await database.connect();
  setup = new UndoLogSetupImpl(connection);
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
});

test.todo("deletion works");
test.todo("update works");