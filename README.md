# sqlite-undo-log

[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)

[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=bugs)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)

[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Lotes_sqlite-undo-log&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Lotes_sqlite-undo-log)

An undo log for SQLite 3

## Example

First, get all needed concepts...

```typescript
const database = new DatabaseImpl(":memory:");
const connection = await database.connect();
const utils = new UndoLogUtilsImpl(connection);
const setup = new UndoLogSetupImpl(connection, utils);
const log = new UndoLogImpl(connection, utils);
```

Then, setup your database, including tables. Each undoable table must be registered at a channel. A channel manages the status (ready, recording, undoing) and is only a number.

```typescript
await setup.install(); //creates needed tables and triggers
await setup.addTable("my_own_table", 0); //0 = channel name
```

Last, but not least: Record your actions and undo them if required.

```typescript
await log.recordWithin(0, undefined, async () => {
  // <-- record all your INSERT, DELETE & UPDATE statements
});

await log.undo(0 /*channel name*/ );
```

## Installed table schema
![](docs/tables.svg)

## File dependencies
![](docs/architecture.svg)

## Plans
* [ ] add adapters for other SQLite implementations
  * [ ] [sqlite](https://www.npmjs.com/package/sqlite)
  * [ ] [sqlite3](https://github.com/TryGhost/node-sqlite3)
  * [ ] [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
* [ ] add user-friendly API
  * [ ] get back deltas, changed entity ids
  * [ ] a own type system
  * [ ] add redo support
    * [ ] Respect undone flag
* [ ] Complex test scenarios
    * [ ] Foreign keys
    * [ ] Triggers
    * [ ] Order relevant
    * [ ] Composite keys
    * [ ] Multiple undos and redos
