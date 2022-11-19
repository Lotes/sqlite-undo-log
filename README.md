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

First, wrap the SQLite client...

```typescript
const database = new NodeSqlite3DatabaseImpl(":memory:");
const connection = await database.connect();
```

Then, create and install the undo log services...

```typescript
const { api } = createUndoLogServices(connection);
const log = await api.initializeSingle();
```

Last, but not least: Record your actions and undo them if required.

```typescript
await log.trackWithin(async () => {
  // <-- record all your INSERT, DELETE & UPDATE statements
});
await log.undo();
```

## Installed table schema
![](docs/tables.svg)

## File dependencies
![](docs/architecture.svg)
