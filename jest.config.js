/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 1,
  maxConcurrency: 1,
  globalSetup: "./src/tests/jestGlobalSetup.js"
};