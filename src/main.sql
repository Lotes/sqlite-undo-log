#include "undo_log/library.hsql"

CREATE TABLE persons (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

__SETUP_UNDO_LOG(persons);

__BEGIN_ACTION(add)
INSERT INTO persons (name) VALUES ('Markus');
INSERT INTO persons (name) VALUES ('Jenny');
INSERT INTO persons (name) VALUES ('Rebecca');
INSERT INTO persons (name) VALUES ('Dorothea');
__END_ACTION