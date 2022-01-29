import { DatabaseImpl } from "./sqlite3-impl";
import { Connection, Database } from "./types";
import { UndoLogSetup, UndoLogSetupImpl } from "./index";
import { doesTableExist } from "./testing/assertions";
import { createTable, insertIntoTable } from "./utils";
import { AllTypeTable } from "./testing/fixtures";

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
  const expected = [
    "actions",
    "categories",
    "changes",
    "columns",
    "channels",
    "tables",
    "values",
  ];
  const actual = await Promise.all(expected.map(async (name) => (await doesTableExist(connection, "undo_" + name)) ? name : null));
  expect(actual).toStrictEqual(expected);
});

test("insertion works", async () => {
  // arrange
  await createTable(connection, "all_types", AllTypeTable.Definition);
  await setup.addTable("all_types", 0);

  // act
  //await insertIntoTable(connection, "all_types", AllTypeTable.Values);

  // assert
});

test.todo("deletion works");
test.todo("update works");