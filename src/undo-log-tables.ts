export interface TableColumn {
  id: number;
  name: string;
  type: string;
  canBeNull?: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
}

export type SqliteType = "TEXT" | "NUMERIC" | "INTEGER" | "REAL" | "BLOB";
export interface SqliteColumnDefinition {
  type: SqliteType;
  canBeNull?: boolean;
  check?: string;
}
export type SqliteColumn = SqliteType | SqliteColumnDefinition;
export interface TableColumns {
  [name: string]: SqliteColumn;
}
export interface ForeignKey {
  referencedTable: string;
  column: string;
  onDelete: "CASCADE" | "SET_NULL" | "NOTHING";
}
export interface TableForeignKeys {
  [name: string]: ForeignKey;
}
export interface TableDefinition {
  name: string;
  primaryKey: string[];
  columns: TableColumns;
  uniques?: string[][];
  foreignKeys?: TableForeignKeys;
}


export type ChangeType = "INSERT"|"DELETE"|"UPDATE";
export type ChannelStatus = "READY"|"RECORDING"|"UNDOING"|"REDOING";

export const Channels: TableDefinition = {
  name: "channels",
  primaryKey: ["id"],
  columns: {
    id: "INTEGER",
    status: {
      type: "TEXT",
      canBeNull: false,
      check: "status IN ('READY','RECORDING','UNDOING','REDOING')",
    },
  },
};

export interface Channel {
  id: number;
  status: ChannelStatus;
}
export const Categories: TableDefinition = {
  name: "categories",
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
export interface Category {
  id: number;
  name: string;
}
export const Actions: TableDefinition = {
  name: "actions",
  primaryKey: ["id"],
  columns: {
    id: "INTEGER",
    created_at: {
      type: "TEXT",
      canBeNull: false,
    },
    order_index: {
      type: "INTEGER",
      canBeNull: false,
    },
    undone: {
      type: "INTEGER",
      canBeNull: false,
      check: "undone IN (0, 1)",
    },
    category_id: {
      type: "INTEGER",
      canBeNull: true,
    },
    channel_id: {
      type: "INTEGER",
      canBeNull: false,
    },
  },
  foreignKeys: {
    category_id: {
      referencedTable: "categories",
      column: "id",
      onDelete: "SET_NULL",
    },
    channel_id: {
      referencedTable: "channels",
      column: "id",
      onDelete: "CASCADE",
    },
  },
};

export interface Action {
  id: number;
  created_at: string;
  category_id: number | null;
  channel_id: number;
  order_index: number;
  undone: boolean;
}

export const Changes: TableDefinition = {
  name: "changes",
  primaryKey: ["id"],
  columns: {
    id: "INTEGER",
    table_id: { type: "INTEGER", canBeNull: false },
    old_row_id: { type: "INTEGER", canBeNull: true },
    new_row_id: { type: "INTEGER", canBeNull: true },
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

export interface Change {
  id: number;
  old_row_id: number;
  new_row_id: number;
  action_id: number;
  table_id: number;
  order_id: number;
  type: ChangeType;
}
export const Tables: TableDefinition = {
  name: "tables",
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

export interface Table {
  id: number;
  name: string;
  channel_id: number;
}
export const Columns: TableDefinition = {
  name: "columns",
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

export interface Column {
  id: number;
  name: string;
  type: string;
  table_id: number;
}

export const Values: TableDefinition = {
  name: "values",
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
      type: "TEXT",
      canBeNull: true,
    },
    new_value: {
      type: "TEXT",
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

export interface Value {
  id: number;
  column_id: number;
  change_id: number;
  old_value: Buffer | null;
  new_value: Buffer | null;
}

export const CleanUpTasks: TableDefinition = {
  name: "clean_up_tasks",
  primaryKey: ["id"],
  columns: {
    id: "INTEGER",
    type: {
      type: "TEXT",
      canBeNull: false,
      check: "type IN ('ROOT', 'TABLE', 'TRIGGER')",
    },
    name: {
      type: 'TEXT',
      canBeNull: false
    },
    ref_table_name: {
      type: 'TEXT',
      canBeNull: true
    },
  },
};

export type CleanUpTaskType = 'ROOT'|'TABLE'|'TRIGGER';

export interface CleanUpTask {
  id: number;
  type: CleanUpTaskType;
  name: string;
  ref_table_name: string|null;
}

export const Configs: TableDefinition = {
  name: "configs",
  primaryKey: ["id"],
  columns: {
    id: "INTEGER",
    name: {
      type: "TEXT",
      canBeNull: false,
    },
    value: {
      type: 'INTEGER',
      canBeNull: false
    },
  },
};

export interface Config {
  id: number;
  name: string;
  value: number;
}

export const Logs: TableDefinition = {
  name: "logs",
  primaryKey: ["id"],
  columns: {
    id: 'INTEGER',
    query: {
      type: "TEXT",
      canBeNull: false,
    },
    parameters: {
      type: 'TEXT',
      canBeNull: false
    },
    location: {
      type: 'TEXT',
      canBeNull: false
    },
  },
};

export interface Log {
  id: number;
  query: string;
  parameters: string;
  location: string;
}

export const tables = [
  CleanUpTasks,
  Channels,
  Categories,
  Actions,
  Changes,
  Tables,
  Columns,
  Values,
  Configs
];