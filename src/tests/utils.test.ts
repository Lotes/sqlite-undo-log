import { Assertions } from "../assertions";
import { Connection } from "../sqlite3";
import { SqliteType } from "../undo-log-tables";
import { DatabaseDefinitionServices } from "../utils/database-definition-services";
import { DatabaseManipulationServices } from "../utils/database-manipulation-services";
import { DatabaseQueryServices } from "../utils/database-query-services";
import { DatabaseUtilitiesServices } from "../utils/database-utilities-services";
import { setupBeforeEach, TableDefintion_OnlyOneType } from "./fixtures";

describe("utils", () => {
  let connection: Connection;
  let assertions: Assertions;
  let manipulations: DatabaseManipulationServices;
  let definitions: DatabaseDefinitionServices;
  let queries: DatabaseQueryServices;
  let utils: DatabaseUtilitiesServices;

  beforeEach(async () => {
    ({
      assertions,
      connection,
      databases: {
        utils,
        queries: queries,
        manipulations: manipulations,
        definitions: definitions,
      },
    } = await setupBeforeEach());
  });

  afterEach(async () => {
    await connection.close();
  });

  describe("createTable", () => {
    test.each<SqliteType>(["TEXT", "NUMERIC", "INTEGER", "REAL", "BLOB"])(
      "table with a %s column only",
      async (type: SqliteType) => {
        // arrange
        const def = TableDefintion_OnlyOneType(type);

        // act
        await definitions.createTable(def.name, def);

        // assert
        await assertions.assertTableExists(def.name);
      }
    );
  });
  describe("insertIntoTable", () => {
    test.each<[SqliteType, any]>([
      ["TEXT", "hallo"],
      ["NUMERIC", 123],
      ["INTEGER", 456],
      ["REAL", 7.891],
      ["BLOB", Buffer.from("dumdidum")],
    ])("table with a %s column only", async (type: SqliteType, value: any) => {
      // arrange
      const def = TableDefintion_OnlyOneType(type);
      await definitions.createTable(def.name, def);

      // act
      await manipulations.insertIntoTable(def.name, { id: 123, col: value });

      // assert
      await assertions.assertTableHas(def.name, { id: 123, col: value });
    });
  });
  describe("updateTable", () => {
    test.each<[SqliteType, any, any]>([
      ["TEXT", "hallo", "wuff"],
      ["NUMERIC", 123, 456],
      ["INTEGER", 456, 789],
      ["REAL", 7.891, 1.333],
      ["BLOB", Buffer.from("dumdidum"), Buffer.from("serious")],
    ])(
      "table with a %s column only",
      async (type: SqliteType, initialValue: any, expected: any) => {
        // arrange
        const def = TableDefintion_OnlyOneType(type);
        await definitions.createTable(def.name, def);
        await manipulations.insertIntoTable(def.name, {
          id: 123,
          col: initialValue,
        });

        // act
        await manipulations.updateTable(def.name, 123, { col: expected });

        // assert
        await assertions.assertTableHas(def.name, { id: 123, col: expected });
      }
    );
  });
  describe("doesColumnExist", () => {
    test.each<SqliteType>(["TEXT", "NUMERIC", "INTEGER", "REAL", "BLOB"])(
      "table with a %s column only",
      async (type: SqliteType) => {
        // arrange
        const def = TableDefintion_OnlyOneType(type);
        await definitions.createTable(def.name, def);

        // act
        const result1 = await definitions.doesColumnExist(def.name, "col");
        const result2 = await definitions.doesColumnExist(
          def.name,
          "col_not_existent"
        );

        // assert
        expect(result1).toBeTruthy();
        expect(result2).toBeFalsy();
      }
    );
  });
  describe("getMetaTable", () => {
    test.each<SqliteType>(["TEXT", "NUMERIC", "INTEGER", "REAL", "BLOB"])(
      "table with a %s column only",
      async (type: SqliteType) => {
        // arrange
        const def = TableDefintion_OnlyOneType(type);
        await definitions.createTable(def.name, def);

        // act
        const [id, col] = await definitions.getMetaTable(def.name);

        // assert
        expect(id.name).toBe("id");
        expect(id.type).toBe("INTEGER");
        expect(id.isPrimaryKey).toBeTruthy();
        expect(col.name).toBe("col");
        expect(col.type).toBe(type);
        expect(col.isPrimaryKey).toBeFalsy();
      }
    );
  });
  describe("doesTableExist", () => {
    test("table is a lie", async () => {
      // arrange + act
      const actual = await definitions.doesTableExist("nope");

      // assert
      expect(actual).toBeFalsy();
    });

    test("table is there", async () => {
      // arrange
      await definitions.createTable("yes", TableDefintion_OnlyOneType("TEXT"));

      // act
      const actual = await definitions.doesTableExist("yes");

      // assert
      expect(actual).toBeTruthy();
    });
  });
  describe("hasTableId", () => {
    test.each<[SqliteType, any]>([
      ["TEXT", "hallo"],
      ["NUMERIC", 123],
      ["INTEGER", 456],
      ["REAL", 7.891],
      ["BLOB", Buffer.from("dumdidum")],
    ])("table with a %s column only", async (type: SqliteType, value: any) => {
      // arrange
      const def = TableDefintion_OnlyOneType(type);
      await definitions.createTable(def.name, def);
      await manipulations.insertIntoTable(def.name, { id: 123, col: value });

      // act + assert
      expect(await queries.hasTableId(def.name, 123)).toBeTruthy();
      expect(await queries.hasTableId(def.name, 456)).toBeFalsy();
    });
  });
  describe("tableHas", () => {
    test.each<[SqliteType, any]>([
      ["TEXT", "hallo"],
      ["NUMERIC", 123],
      ["INTEGER", 456],
      ["REAL", 7.891],
      ["BLOB", Buffer.from("dumdidum")],
    ])(
      "table with a %s column only",
      async (type: SqliteType, expected: any) => {
        // arrange
        const def = TableDefintion_OnlyOneType(type);
        await definitions.createTable(def.name, def);
        await manipulations.insertIntoTable(def.name, {
          id: 123,
          col: expected,
        });

        // act + assert
        const initial = await queries.tableHas(def.name, {
          id: 123,
          col: expected,
        });
        expect(initial[0]).toBeTruthy();
        expect(initial[1].length).toBe(0);
        const actual = await queries.tableHas(def.name, {
          id: 124,
          col: expected,
        });
        expect(actual[0]).toBeFalsy();
        expect(actual[1].length).toBe(1);
      }
    );
  });
  describe("deleteFromTable", () => {
    test.each<[SqliteType, any]>([
      ["TEXT", "hallo"],
      ["NUMERIC", 123],
      ["INTEGER", 456],
      ["REAL", 7.891],
      ["BLOB", Buffer.from("dumdidum")],
    ])("table with a %s column only", async (type: SqliteType, value: any) => {
      // arrange
      const def = TableDefintion_OnlyOneType(type);
      await definitions.createTable(def.name, def);
      await manipulations.insertIntoTable(def.name, { id: 123, col: value });

      // assume
      await assertions.assertTableHasId(def.name, 123);

      // act
      await manipulations.deleteFromTable(def.name, 123);

      // assert
      await assertions.assertTableHasNoId(def.name, 123);
    });
  });
  describe("normalize", () => {
    test.each<[any, any]>([
      ["hallo", "hallo"],
      [123, 123],
      ["123", 123],
      ["X'1234'", Buffer.from("1234", "hex")],
    ])("a value '%s' gets normalized", (from: any, expected: any) => {
      // arrange + act
      const actual = utils.normalize(from);

      // assert
      expect(utils.equals(actual, expected)).toBeTruthy();
    });
  });
  describe("equals", () => {});
});
