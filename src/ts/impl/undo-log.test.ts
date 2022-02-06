import {
  Assertions,
  Connection,
  UndoLog,
  UndoLogSetup,
  UndoLogUtils,
} from "../types";
import { AllTypeTable, setupBeforeEach } from "./fixtures";
import tables, { Action, Change } from "../tables";

describe("UndoLog", () => {
  let connection: Connection;
  let setup: UndoLogSetup;
  let log: UndoLog;
  let utils: UndoLogUtils;
  let assertions: Assertions;

  beforeEach(async () => {
    ({ setup, assertions, utils, log, connection, assertions } =
      await setupBeforeEach());
    await setup.install();
  });

  afterEach(async () => {
    connection.close();
  });

  test("all tables are ready", async () => {
    const expected = Object.getOwnPropertyNames(tables);
    const actual = await Promise.all(
      expected.map(async (name) =>
        (await utils.doesTableExist("undo_" + name)) ? name : null
      )
    );
    expect(actual).toStrictEqual(expected);
  });

  test("insertion works", async () => {
    // arrange
    await utils.createTable("all_types", AllTypeTable.Definition);
    await setup.addTable("all_types", 0);
    await log.recordWithin(0, undefined, async () => {
      // act
      await utils.insertIntoTable("all_types", AllTypeTable.Values[0]);
    });

    // assert
    const rows = await connection.getAll(
      "SELECT column_id, new_value FROM undo_values"
    );
    expect(rows).toEqual([
      { column_id: 0, new_value: "1" },
      { column_id: 1, new_value: "'one'" },
      { column_id: 2, new_value: "1" },
      { column_id: 3, new_value: "'juan'" },
      { column_id: 4, new_value: "0.0" },
    ]);

    const actions = await connection.getAll<Action>(
      "SELECT * FROM undo_actions"
    );
    expect(actions.length).toBe(1);

    const changes = await connection.getAll<Change>(
      "SELECT * FROM undo_changes"
    );
    expect(changes.length).toBe(1);
  });

  test("undo of insertion works", async () => {
    // arrange
    await utils.createTable("all_types", AllTypeTable.Definition);
    await setup.addTable("all_types", 0);
    await log.recordWithin(0, undefined, async () => {
      await utils.insertIntoTable("all_types", AllTypeTable.Values[0]);
    });

    // act
    await log.undo(0);

    // assert
    const rows = await connection.getAll("SELECT * FROM all_types");
    expect(rows).toEqual([]);
  });
});
