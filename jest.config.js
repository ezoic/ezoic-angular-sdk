const { createCjsPreset } = require('jest-preset-angular/presets');

/** @type {import('jest').Config} */
module.exports = {
  ...createCjsPreset({ tsconfig: '<rootDir>/projects/angular-sdk/tsconfig.spec.json' }),
  testEnvironment: 'jest-preset-angular/environments/jest-jsdom-env',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/projects/angular-sdk/**/*.spec.ts'],
  collectCoverageFrom: [
    'projects/angular-sdk/src/**/*.ts',
    '!projects/angular-sdk/src/**/*.spec.ts',
    '!projects/angular-sdk/src/public-api.ts',
  ],
};
