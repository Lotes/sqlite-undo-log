import { TableDefinition, TableDefinitions } from "./types";

const categories: TableDefinition = {
    primaryKey: ["id"],
    columns: {
        id: "INTEGER",
        name: {
            type:"TEXT", 
            canBeNull: false
        }
    },
    uniques: [["name"]]
}

const actions: TableDefinition = {
    primaryKey: ["id"],
    columns: {
        id: "INTEGER",
        created_at: {
            type:"TEXT", 
            canBeNull: false
        },
        category_id: {
            type: "INTEGER",
            canBeNull: true
        }
    },
    foreignKeys: {
        category_id: {
            referencedTable: "categories",
            column: "id",
            onDelete: "SET_NULL"
        }
    }
}

const changes: TableDefinition = {
    primaryKey: ["id"],
    columns: {
        id: "INTEGER",
        row_id: {type: "INTEGER", canBeNull: false},
        action_id: {type: "INTEGER", canBeNull: false},
        order_index: {type: "INTEGER", canBeNull: false},
        type: {type: "TEXT", canBeNull: false, check: "type IN ('INSERT','DELETE','UPDATE')"}
    },
    foreignKeys: {
        action_id: {
            referencedTable: "actions",
            column: "id",
            onDelete: "CASCADE"
        }
    }
};

const channels: TableDefinition = {
    primaryKey: ["id"],
    columns: {
      id: "INTEGER",
      action_id: {
          type:"INTEGER",
          canBeNull: true
      }
    },
    foreignKeys: {
        action_id: {
            referencedTable: "actions",
            column: "id",
            onDelete: "NOTHING"
        }
    }
};

const tables: TableDefinition = {
    primaryKey: ["id"],
    columns: {
        id: "INTEGER",
        name: {
            type: "TEXT",
            canBeNull: false
        },
        channel_id: {
            type:"INTEGER",
            canBeNull: false
        }
    },
    uniques: [["name"]],
    foreignKeys: {
        channel_id: {
            referencedTable: "channels",
            column: "id",
            onDelete: "CASCADE"
        }
    }
};

const columns: TableDefinition = {
    primaryKey: ["id"],
    columns: {
        id: "INTEGER",
        name: {
            type: "TEXT",
            canBeNull: false
        },
        type: {
            type: "TEXT",
            canBeNull: false
        },
        table_id: {
            type:"INTEGER",
            canBeNull: false
        }
    },
    uniques: [["table_id", "name"]],
    foreignKeys: {
        table_id: {
            referencedTable: "tables",
            column: "id",
            onDelete: "CASCADE"
        }
    }
};

const values: TableDefinition = {
    primaryKey: ["id"],
    columns: {
        id: "INTEGER",
        column_id: {
            type:"INTEGER",
            canBeNull: false
        },
        change_id: {
            type:"INTEGER",
            canBeNull: false
        },
        old_value: {
            type: "BLOB",
            canBeNull: true
        },
        new_value: {
            type: "BLOB",
            canBeNull: true
        }
    },
    foreignKeys: {
        column_id: {
            referencedTable: "columns",
            column: "id",
            onDelete: "CASCADE"
        },
        change_id: {
            referencedTable: "changes",
            column: "id",
            onDelete: "CASCADE"
        },
    }
};

const all: TableDefinitions = {
    categories,
    actions,
    changes,
    channels,
    tables,
    columns,
    values
};

export const tableOrder = ["categories", "actions", "changes", "channels", "tables", "columns", "values"];
export default all;