import { Assertions } from "../assertions";
import { Connection } from "../sqlite3";
import { tables } from "../undo-log-tables";
import { UndoLog } from "../undo-log";
import { UndoLogAssertions } from "../undo-log-assertions";
import { UndoLogSetup } from "../undo-log-setup";
import { AllTypeTable, setupBeforeEach } from "./fixtures";
import { DatabaseDefinitionServices } from "../utils/database-definition-services";
import { DatabaseManipulationServices } from "../utils/database-manipulation-services";

describe("UndoLog", () => {
  let connection: Connection;
  let logSetup: UndoLogSetup;
  let log: UndoLog;
  let definitions: DatabaseDefinitionServices;
  let manipulations: DatabaseManipulationServices;
  let assertions: Assertions;
  let logAssertions: UndoLogAssertions;

  beforeEach(async () => {
    let rest;
    ({ logSetup, logAssertions, assertions, log, connection, databases: { definition: definitions, manipulation: manipulations} } = await setupBeforeEach());
    await logSetup.install();
    await logSetup.enableDebugMode(true);
  });

  afterEach(async () => {
    await connection.close();
  });

  test("tables are existing", async () => {
    const expected = tables.map((t) => t.name);
    const actual = await Promise.all(
      expected.map(async (name) =>
        (await definitions.doesTableExist("undo_" + name)) ? name : null
      )
    );
    expect(actual).toStrictEqual(expected);
  });

  describe("recording", () => {
    test("insertion works", async () => {
      // arrange
      await definitions.createTable("all_types", AllTypeTable.Definition);
      await logSetup.addTable("all_types", 0);

      // act
      await log.startTracking(0);
      try {
        await manipulations.insertIntoTable("all_types", AllTypeTable.Values[0]);
      } finally {
        await log.stopTracking(0);
      }

      // assert
      const channel = await logAssertions.assertChannelInStatus(0, "READY");
      const [action] = await logAssertions.assertChannelHasActions(channel, 1);
      const [change] = await logAssertions.assertActionHasChanges(action, 1);
      expect(change.type).toBe("INSERT");
      await logAssertions.assertChangeHasValues(change, "new", {
        id: "1",
        name: "one",
        num: "1",
        blob: Buffer.from("juan"),
        zero: "0.0",
      });
    });

    test("deletion works", async () => {
      // arrange
      await definitions.createTable("all_types", AllTypeTable.Definition);
      await manipulations.insertIntoTable("all_types", AllTypeTable.Values[0]);
      await logSetup.addTable("all_types", 0);

      // act
      await log.startTracking(0);
      try {
        await manipulations.deleteFromTable("all_types", AllTypeTable.Values[0].id);
      } finally  {
        await log.stopTracking(0);
      }

      // assert
      const channel = await logAssertions.assertChannelInStatus(0, "READY");
      const [action] = await logAssertions.assertChannelHasActions(channel, 1);
      const [change] = await logAssertions.assertActionHasChanges(action, 1);
      expect(change.type).toBe("DELETE");
      await logAssertions.assertChangeHasValues(change, "old", {
        id: "1",
        name: "one",
        num: "1",
        blob: Buffer.from("juan"),
        zero: "0.0",
      });
    });

    test("update works", async () => {
      // arrange
      await definitions.createTable("all_types", AllTypeTable.Definition);
      await manipulations.insertIntoTable("all_types", AllTypeTable.Values[0]);
      await logSetup.addTable("all_types", 0);

      // act
      await log.startTracking(0);
      try {
        await manipulations.updateTable<AllTypeTable.Row>(
          "all_types",
          AllTypeTable.Values[0].id,
          {
            name: "TADAA",
            zero: 1,
          }
        );
      } finally {
        await log.stopTracking(0);
      }

      // assert
      const channel = await logAssertions.assertChannelInStatus(0, "READY");
      const [action] = await logAssertions.assertChannelHasActions(channel, 1);
      const [change] = await logAssertions.assertActionHasChanges(action, 1);
      expect(change.type).toBe("UPDATE");
      await logAssertions.assertChangeHasValues(change, "new", {
        name: "TADAA",
        zero: "1.0",
      });
      await logAssertions.assertChangeHasValues(change, "old", {
        name: "one",
        zero: "0.0",
      });
    });
  });

  describe("undoing", () => {
    test("insertion works", async () => {
      // arrange
      await definitions.createTable("all_types", AllTypeTable.Definition);
      await logSetup.addTable("all_types", 0);
      await log.startTracking(0);
      try{
        await manipulations.insertIntoTable("all_types", AllTypeTable.Values[0]);
      } finally {
        await log.stopTracking(0);
      }

      // act
      await log.undo(0);

      // assert
      const rows = await connection.getAll("SELECT * FROM all_types");
      expect(rows).toEqual([]);
    });

    test("deletion works", async () => {
      // arrange
      await definitions.createTable("all_types", AllTypeTable.Definition);
      await manipulations.insertIntoTable("all_types", AllTypeTable.Values[0]);
      await logSetup.addTable("all_types", 0);
      await log.startTracking(0);
      try {
        await manipulations.deleteFromTable("all_types", AllTypeTable.Values[0].id);
      } finally {
        await log.stopTracking(0);
      }

      // act
      await log.undo(0);

      // assert
      await assertions.assertTableHas("all_types", AllTypeTable.Values[0]);
    });

    test("update works", async () => {
      // arrange
      await definitions.createTable("all_types", AllTypeTable.Definition);
      await manipulations.insertIntoTable("all_types", AllTypeTable.Values[0]);
      await logSetup.addTable("all_types", 0);
      await log.startTracking(0);
      try {
        await manipulations.updateTable<AllTypeTable.Row>(
          "all_types",
          AllTypeTable.Values[0].id,
          {
            blob: Buffer.from("it lives"),
            num: 333,
          }
        );
      } finally {
        await log.stopTracking(0);
      }

      // act
      await log.undo(0);

      // assert
      await assertions.assertTableHas("all_types", AllTypeTable.Values[0]);
    });
  });
});
