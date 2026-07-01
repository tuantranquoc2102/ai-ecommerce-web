import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  moduleNameMapper: {
    '^@ecom/db$': '<rootDir>/../../packages/db/src/index.ts',
    '^@ecom/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@ecom/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true }],
  },
};

export default config;
