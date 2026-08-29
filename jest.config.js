module.exports = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': ['babel-jest', { presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]] }],
      },
      testMatch: ['<rootDir>/src/{core,data,ai,app}/**/__tests__/**/*.test.ts'],
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      testMatch: [
        '<rootDir>/src/ui/**/__tests__/**/*.test.tsx',
        '<rootDir>/app/**/__tests__/**/*.test.tsx',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ui.js'],
    },
  ],
};
