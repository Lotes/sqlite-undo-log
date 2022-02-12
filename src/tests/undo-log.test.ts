import { Connection } from "../sqlite3";
import { tables } from "../tables";
import { UndoLog } from "../undo-log";
import { UndoLogAssertions } from "../undo-log-assertions";
import { UndoLogSetup } from "../undo-log-setup";
import { UndoLogUtils } from "../undo-log-utils";
import { AllTypeTable, setupBeforeEach } from "./fixtures";

describe("UndoLog", () => {
  let connection: Connection;
  let setup: UndoLogSetup;
  let log: UndoLog;
  let utils: UndoLogUtils;
  let assertions: UndoLogAssertions;

  beforeEach(async () => {
    ({ setup, assertions, utils, log, connection, assertions } =
      await setupBeforeEach());
    await setup.install();
  });

  afterEach(async () => {
    await connection.close();
  });

  test("tables are existing", async () => {
    const expected = tables.map((t) => t.name);
    const actual = await Promise.all(
      expected.map(async (name) =>
        (await utils.doesTableExist("undo_" + name)) ? name : null
      )
    );
    expect(actual).toStrictEqual(expected);
  });

  describe("recording", () => {
    test("insertion works", async () => {
      // arrange
      await utils.createTable("all_types", AllTypeTable.Definition);
      await setup.addTable("all_types", 0);

      // act
      await log.recordWithin(0, undefined, async () => {
        await utils.insertIntoTable("all_types", AllTypeTable.Values[0]);
      });

      // assert
      const channel = await assertions.assertChannelInStatus(0, "READY");
      const [action] = await assertions.assertChannelHasActions(channel, 1);
      const [change] = await assertions.assertActionHasChanges(action, 1);
      expect(change.type).toBe("INSERT");
      await assertions.assertChangeHasValues(change, "new", {
        id: "1",
        name: "'one'",
        num: "1",
        blob: Buffer.from("juan"),
        zero: "0.0",
      });
    });

    test("deletion works", async () => {
      // arrange
      await utils.createTable("all_types", AllTypeTable.Definition);
      await utils.insertIntoTable("all_types", AllTypeTable.Values[0]);
      await setup.addTable("all_types", 0);

      // act
      await log.recordWithin(0, undefined, async () => {
        await utils.deleteFromTable("all_types", AllTypeTable.Values[0].id);
      });

      // assert
      const channel = await assertions.assertChannelInStatus(0, "READY");
      const [action] = await assertions.assertChannelHasActions(channel, 1);
      const [change] = await assertions.assertActionHasChanges(action, 1);
      expect(change.type).toBe("DELETE");
      await assertions.assertChangeHasValues(change, "old", {
        id: "1",
        name: "'one'",
        num: "1",
        blob: Buffer.from("juan"),
        zero: "0.0",
      });
    });

    test("update works", async () => {
      // arrange
      await utils.createTable("all_types", AllTypeTable.Definition);
      await utils.insertIntoTable("all_types", AllTypeTable.Values[0]);
      await setup.addTable("all_types", 0);

      // act
      await log.recordWithin(0, undefined, async () => {
        await utils.updateTable<AllTypeTable.Row>(
          "all_types",
          AllTypeTable.Values[0].id,
          {
            name: "TADAA",
            zero: 1,
          }
        );
      });

      // assert
      const channel = await assertions.assertChannelInStatus(0, "READY");
      const [action] = await assertions.assertChannelHasActions(channel, 1);
      const [change] = await assertions.assertActionHasChanges(action, 1);
      expect(change.type).toBe("UPDATE");
      await assertions.assertChangeHasValues(change, "new", {
        name: "'TADAA'",
        zero: "1.0",
      });
      await assertions.assertChangeHasValues(change, "old", {
        name: "'one'",
        zero: "0.0",
      });
    });
  });

  describe("undoing", () => {
    test("insertion works", async () => {
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

    test("deletion works", async () => {
      // arrange
      await utils.createTable("all_types", AllTypeTable.Definition);
      await utils.insertIntoTable("all_types", AllTypeTable.Values[0]);
      await setup.addTable("all_types", 0);
      await log.recordWithin(0, undefined, async () => {
        await utils.deleteFromTable("all_types", AllTypeTable.Values[0].id);
      });

      // act
      await log.undo(0);

      // assert
      await assertions.assertTableHas("all_types", AllTypeTable.Values[0]);
    });
  });
});
