/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: [
    '**/js/extraction/__tests__/**/*.test.js',
    '**/js/extraction/**/*.test.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: [
    'js/extraction/**/*.js',
    '!js/extraction/__tests__/**',
    '!js/extraction/index.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000, // 30 seconds for property-based tests
  transform: {}
};

module.exports = config;
