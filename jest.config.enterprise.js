// Performance-optimized Jest configuration for enterprise testing
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Performance optimizations
  maxWorkers: '50%',
  clearMocks: true,
  restoreMocks: true,
  
  // Test patterns
  testMatch: [
    '<rootDir>/DetailsList/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/DetailsList/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  
  // Coverage configuration (industry standard)
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Module mapping for PCF and React
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/DetailsList/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/config/jest.setup.js',
    '@testing-library/jest-dom'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        allowJs: true
      }
    }
  },
  
  // Test timeout for performance tests
  testTimeout: 30000,
  
  // Serializers for Fluent UI
  snapshotSerializers: ['@fluentui/jest-serializer-merge-styles'],
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results',
      filename: 'report.html'
    }]
  ],
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};
