import { DatabaseImpl } from "./sqlite3-impl";
import { Connection, Database } from "./types";
import { install } from "./index";
import { assertTableExists } from "./assertions";

const database: Database = new DatabaseImpl();
let connection: Connection;

beforeEach(async () => {
  connection = await database.connect();
  await install(connection);
});

afterEach(() => {

});

test("all tables are ready", async () => {
  [
    "actions",
    "categories",
    "changes",
    "columns",
    "controls",
    "tables",
    "values",
  ].forEach(async (name) => {
    await assertTableExists(connection, "undo_" + name);
  });
});

test("insertion works", async () => {

});

test.todo("deletion works");
test.todo("update works");