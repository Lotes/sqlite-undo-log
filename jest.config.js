/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testResultsProcessor: "jest-sonar-reporter",
  maxWorkers: 1,
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/tests/"
  ],
  maxConcurrency: 1,
  globalSetup: "./src/tests/jestGlobalSetup.js"
};