module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.stories.{ts,tsx}',
    '!packages/*/src/**/*.test.{ts,tsx}',
    '!packages/*/src/**/*.spec.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@aiser-world/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@aiser-world/types/(.*)$': '<rootDir>/packages/shared/types/$1',
    '^@aiser-world/utils/(.*)$': '<rootDir>/packages/shared/utils/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};