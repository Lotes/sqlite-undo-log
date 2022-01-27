CREATE TABLE undo_categories (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE undo_actions (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME NOT NULL,
  category_id INT NULL,
  FOREIGN KEY (category_id)
    REFERENCES undo_categories(id)
    ON DELETE SET NULL
);

CREATE TABLE undo_changes (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  row_id INTEGER NOT NULL,
  action_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('INSERT','DELETE','CREATE')),
  FOREIGN KEY (action_id)
    REFERENCES undo_actions(id)
    ON DELETE CASCADE
);

CREATE TABLE undo_controls (
  head_id INTEGER NOT NULL PRIMARY KEY,
  action_id INTEGER NULL,
  FOREIGN KEY(action_id)
    REFERENCES undo_actions(id)
    ON DELETE SET NULL
);

CREATE TABLE undo_tables (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE undo_columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  table_id INTEGER NOT NULL,
  UNIQUE (table_id, name),
  FOREIGN KEY(table_id)
    REFERENCES undo_tables(id)
    ON DELETE CASCADE
);

CREATE TABLE undo_values (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  column_id INTEGER NOT NULL,
  change_id INTEGER NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  FOREIGN KEY (column_id)
    REFERENCES undo_columns(id)
    ON DELETE CASCADE,
  FOREIGN KEY (change_id)
    REFERENCES undo_changes(id)
    ON DELETE CASCADE
);