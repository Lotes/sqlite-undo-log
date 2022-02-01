import { TableDefinition, TableDefinitions } from "./types";

namespace Categories {
  export const TableDef: TableDefinition = {
    primaryKey: ["id"],
    columns: {
      id: "INTEGER",
      name: {
        type: "TEXT",
        canBeNull: false,
      },
    },
    uniques: [["name"]],
  };
  export interface Row {
    id: number;
    name: string;
  }
}

namespace Actions {
  export const TableDef: TableDefinition = {
    primaryKey: ["id"],
    columns: {
      id: "INTEGER",
      created_at: {
        type: "TEXT",
        canBeNull: false,
      },
      category_id: {
        type: "INTEGER",
        canBeNull: true,
      },
    },
    foreignKeys: {
      category_id: {
        referencedTable: "categories",
        column: "id",
        onDelete: "SET_NULL",
      },
    },
  };

  export interface Row {
    id: number;
    created_at: string;
    category_id: number | null;
  }
}

namespace Changes {
  export const TableDef: TableDefinition = {
    primaryKey: ["id"],
    columns: {
      id: "INTEGER",
      table_id: { type: "INTEGER", canBeNull: false },
      row_id: { type: "INTEGER", canBeNull: false },
      action_id: { type: "INTEGER", canBeNull: false },
      order_index: { type: "INTEGER", canBeNull: false },
      type: {
        type: "TEXT",
        canBeNull: false,
        check: "type IN ('INSERT','DELETE','UPDATE')",
      },
    },
    foreignKeys: {
      action_id: {
        referencedTable: "actions",
        column: "id",
        onDelete: "CASCADE",
      },
      table_id: {
        referencedTable: "tables",
        column: "id",
        onDelete: "CASCADE",
      },
    },
  };

  export interface Row {
    id: number;
    row_id: number;
    action_id: number;
    table_id: number;
    order_id: number;
    type: "INSERT" | "DELETE" | "UPDATE";
  }
}

namespace Channels {
  export const TableDef: TableDefinition = {
    primaryKey: ["id"],
    columns: {
      id: "INTEGER",
      action_id: {
        type: "INTEGER",
        canBeNull: true,
      },
    },
    foreignKeys: {
      action_id: {
        referencedTable: "actions",
        column: "id",
        onDelete: "NOTHING",
      },
    },
  };

  export interface Row {
    id: number;
    action_id: number | null;
  }
}

namespace Tables {
  export const TableDef: TableDefinition = {
    primaryKey: ["id"],
    columns: {
      id: "INTEGER",
      name: {
        type: "TEXT",
        canBeNull: false,
      },
      channel_id: {
        type: "INTEGER",
        canBeNull: false,
      },
    },
    uniques: [["name"]],
    foreignKeys: {
      channel_id: {
        referencedTable: "channels",
        column: "id",
        onDelete: "CASCADE",
      },
    },
  };

  export interface Row {
    id: number;
    name: string;
    channel_id: number;
  }
}

namespace Columns {
  export const TableDef: TableDefinition = {
    primaryKey: ["id"],
    columns: {
      id: "INTEGER",
      name: {
        type: "TEXT",
        canBeNull: false,
      },
      type: {
        type: "TEXT",
        canBeNull: false,
      },
      table_id: {
        type: "INTEGER",
        canBeNull: false,
      },
    },
    uniques: [["table_id", "name"]],
    foreignKeys: {
      table_id: {
        referencedTable: "tables",
        column: "id",
        onDelete: "CASCADE",
      },
    },
  };

  export interface Row {
    id: number;
    name: string;
    type: string;
    table_id: number;
  }
}

namespace Values {
  export const TableDef: TableDefinition = {
    primaryKey: ["id"],
    columns: {
      id: "INTEGER",
      column_id: {
        type: "INTEGER",
        canBeNull: false,
      },
      change_id: {
        type: "INTEGER",
        canBeNull: false,
      },
      old_value: {
        type: "BLOB",
        canBeNull: true,
      },
      new_value: {
        type: "BLOB",
        canBeNull: true,
      },
    },
    foreignKeys: {
      column_id: {
        referencedTable: "columns",
        column: "id",
        onDelete: "CASCADE",
      },
      change_id: {
        referencedTable: "changes",
        column: "id",
        onDelete: "CASCADE",
      },
    },
  };

  export interface Row {
    id: number;
    column_id: number;
    change_id: number;
    old_value: Buffer | null;
    new_value: Buffer | null;
  }
}

const all: TableDefinitions = {
  categories: Categories.TableDef,
  actions: Actions.TableDef,
  changes: Changes.TableDef,
  channels: Channels.TableDef,
  tables: Tables.TableDef,
  columns: Columns.TableDef,
  values: Values.TableDef,
};

export namespace Row {
  export type Category = Categories.Row;
  export type Action = Actions.Row;
  export type Change = Changes.Row;
  export type Channel = Channels.Row;
  export type Table = Tables.Row;
  export type Column = Columns.Row;
  export type Value = Values.Row;
}

export default all;
