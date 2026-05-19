module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  roots: ['<rootDir>/lambda/tests'],
  collectCoverageFrom: [
    'lambda/services/**/*.js',
    'lambda/middleware/**/*.js',
    'lambda/utils/**/*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/lambda/tests/setup.js']
};
